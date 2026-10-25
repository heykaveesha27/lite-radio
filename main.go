package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type StationSubmission struct {
	Name     string  `json:"name"`
	URL      string  `json:"url"`
	Homepage string  `json:"homepage"`
	Country  string  `json:"country"`
	City     string  `json:"city"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Language string  `json:"language"`
}

func isStreamValid(streamURL string) bool {
	client := &http.Client{Timeout: 5 * time.Second}

	req, err := http.NewRequest("GET", streamURL, nil)
	if err != nil {
		return false
	}
	req.Header.Set("Range", "bytes=0-100")
	resp, err := client.Do(req)
	if err != nil {
		return false
	}

	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 || resp.StatusCode == 206 {
		contentType := resp.Header.Get("Content-Type")
		return strings.HasPrefix(contentType, "audio/")
	}

	return false

}

type Station struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type City struct {
	Name     string    `json:"name"`
	Country  string    `json:"country"`
	Lat      float64   `json:"lat"`
	Lng      float64   `json:"lng"`
	Stations []Station `json:"stations"`
}

type RBStation struct {
	Name     string  `json:"name"`
	URL      string  `json:"url_resolved"`
	Country  string  `json:"country"`
	State    string  `json:"state"`
	Lat      float64 `json:"geo_lat"`
	Lng      float64 `json:"geo_long"`
	Language string  `json:"language"`
}

func syncRadioBrowser(db *sql.DB) {
	log.Println("Fetching live stations from Radio_Browser API...")

	apiURL := "https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=55000"
	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("API request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	var stations []RBStation
	if err := json.NewDecoder(resp.Body).Decode(&stations); err != nil {
		log.Printf("Failed to decode JSON: %v\n", err)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}

	stmt, err := tx.Prepare(`
			INSERT INTO stations (city_name, country, lat, lng, station_name, stream_url)
			VALUES (?, ?, ?, ?, ?, ?)
	`)

	if err != nil {
		log.Fatal(err)
	}

	defer stmt.Close()

	insertedCount := 0
	for _, s := range stations {
		if s.URL == "" || s.Name == "" {
			continue
		}

		cityName := s.State
		if cityName == "" {
			cityName = "Unknown Region"
		}

		_, err = stmt.Exec(cityName, s.Country, s.Lat, s.Lng, s.Name, s.URL)
		if err == nil {
			insertedCount++
		}
	}

	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}

	log.Printf("Successfully imported %d new stations to the database!\n", insertedCount)
}

func handleAddStation(db *sql.DB) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		var payload StationSubmission
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
			return
		}

		if payload.City == "" || payload.Country == "" {
			http.Error(w, `{"error": "City and Country are required"}`, http.StatusBadRequest)
			return
		}
		if !isStreamValid(payload.URL) {
			http.Error(w, `{"error": "Stream URL is offline or invalid"}`, http.StatusBadRequest)
			return
		}

		rbPayload := map[string]interface{}{
			"name":     payload.Name,
			"url":      payload.URL,
			"homepage": payload.Homepage,
			"country":  payload.Country,
			"state":    payload.City,
			"geo_lat":  payload.Lat,
			"geo_long": payload.Lng,
			"language": payload.Language,
		}

		jsonData, _ := json.Marshal(rbPayload)
		req, _ := http.NewRequest("POST", "https://de1.api.radio-browser.info/json/add", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "My3DRadioGlobe/1.0")

		/*client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != 200 {
			http.Error(w, `{"error":"Failed to save to global database"}`, http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()*/

		_, err := db.Exec(`
		INSERT INTO stations (city_name, country, lat, lng, station_name, stream_url, language)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, payload.City, payload.Country, payload.Lat, payload.Lng, payload.Name, payload.URL, payload.Language)

		if err != nil {
			log.Printf("Failed to cache new station locally: %v", err)
			http.Error(w, `{"error":"Failed to save station locally"}`, http.StatusInternalServerError)
			return
		}

		/*globalCities = append(globalCities, City{
			Name: payload.City,
			Country: payload.Country,
			Lat: payload.Lat,
			Lng: payload.Lng,
			Stations: []Station{
				{Name: payload.Name, URL: payload.URL},
			},
		})*/

		//success response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		w.Write([]byte(`{"success": true, "message": "Station validated and added"}`))

	}
}

func main() {

	// 1. Initialize SQLite Database
	db, err := sql.Open("sqlite", "./radio.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	initDB(db)
	var count int

	err = db.QueryRow("SELECT COUNT(*) FROM stations").Scan(&count)
	if err != nil {
		log.Printf("Error checking station count: %v", err)
	} else if count == 0 {
		log.Println("Database is empty count: %v", err)
	} else {
		log.Printf("Database ready! Loaded %d stations", count)
	}


	http.HandleFunc("/api/add/station", handleAddStation(db))

	// 2. Set up HTTP Router
	mux := http.NewServeMux()

	// Serve the frontend HTML/CSS/JS
	mux.Handle("/", http.FileServer(http.Dir("./public")))
	mux.HandleFunc("/api/add/station", handleAddStation(db))
	// API Endpoint: Get all stations grouped by city
	mux.HandleFunc("GET /api/cities", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query("SELECT city_name, country, lat, lng, station_name, stream_url  FROM stations")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		cityMap := make(map[string]*City)

		for rows.Next() {
			var cityName, country, stationName, streamURL string
			var lat, lng float64

			if err := rows.Scan(&cityName, &country, &lat, &lng, &stationName, &streamURL); err != nil {
				continue
			}

			// Group by city name
			if _, exists := cityMap[cityName]; !exists {
				cityMap[cityName] = &City{
					Name:     cityName,
					Country:  country,
					Lat:      lat,
					Lng:      lng,
					Stations: []Station{},
				}
			}

			cityMap[cityName].Stations = append(cityMap[cityName].Stations, Station{
				Name: stationName,
				URL:  streamURL,
			})
		}

		// Convert map to slice for JSON array
		var cities []City
		for _, city := range cityMap {
			cities = append(cities, *city)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cities)
	})

	log.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

// initDB creates the table and inserts default data if empty (perfect for portfolios)
func initDB(db *sql.DB) {
	createTable := `
	CREATE TABLE IF NOT EXISTS stations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		city_name TEXT,
		country TEXT,
		lat REAL,
		lng REAL,
		station_name TEXT,
		stream_url TEXT,
		language TEXT
	);`

	_, err := db.Exec(createTable)
	if err != nil {
		log.Fatal(err)
	}

	rows, err := db.Query("PRAGMA table_info(stations)")
	if err != nil {
		log.Fatal(err)
	}
	hasLanguage := false
	for rows.Next() {
		var cid, notNull, primaryKey int
		var name, columnType string
		var defaultValue sql.NullString
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			rows.Close()
			log.Fatal(err)
		}
		if name == "language" {
			hasLanguage = true
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		log.Fatal(err)
	}
	if err := rows.Close(); err != nil {
		log.Fatal(err)
	}
	if !hasLanguage {
		if _, err := db.Exec("ALTER TABLE stations ADD COLUMN language TEXT"); err != nil {
			log.Fatal(err)
		}
	}

	// Check if data exists
	var count int
	db.QueryRow("SELECT COUNT(*) FROM stations").Scan(&count)

	if count == 0 {
		log.Println("Database is empty. Initiating sync...")
		syncRadioBrowser(db)
	}
}
