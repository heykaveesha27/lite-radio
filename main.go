package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"


	_ "modernc.org/sqlite"
)

type Station struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type City struct {
	Name	string	`json:"name"`
	Country	string	`json:"country"`
	Lat		float64	`json:"lat"`
	Lng		float64	`json:"lng"`
	Stations	[]Station	`json:"stations"`
}

type RBStation struct {
	Name     string    `json:"name"`
	URL      string    `json:"url_resolved"`
	Country  string    `json:"country"`
	State	 string    `json:"state"`
	Lat      float64   `json:"geo_lat"`
	Lng      float64   `json:"geo_long"`
}

func syncRadioBrowser(db *sql.DB){
	log.Println("Fetching live stations from Radio_Browser API...")

	apiURL := "https://de1.api.radio-browser.info/json/stations/search?has_geo_info=true&hidebroken=true&limit=55000"
	resp, err := http.Get(apiURL)
	if err != nil {
		log.Printf("API request failed: %v\n",err)
		return
	}
	defer resp.Body.Close()

	var stations []RBStation
	if err := json.NewDecoder(resp.Body).Decode(&stations); err != nil{
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
	for _, s := range stations{
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

	log.Printf("Successfully imported %d new stations to the database!\n",insertedCount)
}

func main() {
	// 1. Initialize SQLite Database
	db, err := sql.Open("sqlite", "./radio.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	initDB(db)

	// 2. Set up HTTP Router
	mux := http.NewServeMux()

	// Serve the frontend HTML/CSS/JS
	mux.Handle("/", http.FileServer(http.Dir("./public")))

	// API Endpoint: Get all stations grouped by city
	mux.HandleFunc("GET /api/cities", func(w http.ResponseWriter, r *http.Request) {
rows, err := db.Query("SELECT city_name, country, lat, lng, station_name, stream_url FROM stations")
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
		stream_url TEXT
	);`
	
	_, err := db.Exec(createTable)
	if err != nil {
		log.Fatal(err)
	}

	// Check if data exists
	var count int
	db.QueryRow("SELECT COUNT(*) FROM stations").Scan(&count)
	
	if count == 0 {
		log.Println("Database is empty. Initiating sync...")
		syncRadioBrowser(db)
	}
}