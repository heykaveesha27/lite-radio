
//<i class="fa-solid fa-magnifying-glass"></i>
//<i class="fa-solid fa-play"></i>
//<i class="fa-solid fa-pause"></i>
//<i class="fa-solid fa-plus"></i>
//<i class="fa-regular fa-star"></i>
//<i class="fa-solid fa-minus"></i>
//<i class="fa-solid fa-unlock"></i>
//<i class="fa-solid fa-lock"></i>
//<i class="fa-solid fa-gear"></i>
//<i class="fa-solid fa-circle-notch"></i>
//<i class="fa-regular fa-heart fa-xs"></i>

import { TextureLoader, ShaderMaterial, Vector3 ,Vector2} from 'https://esm.sh/three';
import * as solar from 'https://esm.sh/solar-calculator';

const loader = new TextureLoader();
const [dayTexture, nightTexture] = await Promise.all([
  loader.loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg'),
  loader.loadAsync('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
]);



const material = new ShaderMaterial({
  uniforms: {
    dayTexture: { value: dayTexture },
    nightTexture: { value: nightTexture },
    sunDirection: { value: new Vector3(1, 0, 0) }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normal);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunDirection;
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      float light = dot(normalize(vNormal), normalize(sunDirection));
      float blend = smoothstep(-0.1, 0.1, light);
      gl_FragColor = mix(
        texture2D(nightTexture, vUv),
        texture2D(dayTexture, vUv),
        blend
      );
    }
  `
});


function updateSunDirection(){
    const now = new Date();
    const utcMidnight = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
    const century = solar.century(now.getTime());
    const longitude = ((utcMidnight-now.getTime())/86400000)*360-(90)-(solar.equationOfTime(century)/4);
    const latitude=solar.declination(century);
    const longitudeRadians = longitude*Math.PI/180;
    const latitudeRadians = latitude*Math.PI/180;


material.uniforms.sunDirection.value.set(
  Math.cos(latitudeRadians) * Math.cos(longitudeRadians),
  Math.sin(latitudeRadians),
  Math.cos(latitudeRadians) * Math.sin(longitudeRadians)
).normalize();
    }

    updateSunDirection();
    setInterval(updateSunDirection,1000)
/*
let now = new Date();
let hours =  now.getHours();
let minutes = now.getMinutes();
let seconds = now.getSeconds();
let totalSeconds = hours*60*60 + minutes*60+seconds;
let angle=totalSeconds;
let previoiusTime;
function animate(timestamp){
    
    if (previoiusTime !==undefined){
        const deltaSeconds = (timestamp-previoiusTime)/1000;
        angle += (2 * Math.PI / 86400) * deltaSeconds;
        material.uniforms.sunDirection.value.set(
            Math.cos(180),
            0,
            Math.sin(180)
        )
    }

    previoiusTime=timestamp
    requestAnimationFrame(animate)
}
animate();
console.log(totalSeconds);*/
        let lastRenderedCity = null;

        let timeInterval = null;
        
        function startLocalClock(lat, lng){
            const timeEl = document.getElementById('local-time');
            
            if (timeInterval) clearInterval(timeInterval);
            console.log("time function called")
            let timeZoneName;
            try{
                timeZoneName = tzlookup(lat, lng);
            }catch (err){
                timeEl.textContent = "error";
                console.log(err)
                return;
            }

            const updateTime = () => {
                const now = new Date();

                const timeString = now.toLocaleTimeString('en-US', {
                    timeZone: timeZoneName,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: false
                });

                timeEl.innerHTML = `<span style={fontSize:"1rem"}>${timeString}</span>`
            }

            updateTime();
            timeInterval=setInterval(updateTime,1000)
        }

        const audioPlayer = document.getElementById('audioPlayer');
        const nowPlayingText = document.getElementById('now-playing');
        const cityNameEl = document.getElementById('city-name');
        const stationListEl = document.getElementById('station-list');

        const stationName = document.getElementById('stationName')
        //const playerStation = document.getElementById('player-station')
        const playerFreq = document.getElementById('player-freq')
        //const playerLocation = document.getElementById('player-location')
        const playPauseButton = document.getElementById('play-pause-button')
        const volumeSlider = document.getElementById('volume-slider')

        const searchInput = document.getElementById('search-input');

        const defaultActions = document.getElementById('default-actions');
        const searchContainer = document.getElementById('search-container');
        const searchTrigger = document.getElementById('search-trigger');
        const closeSearchBtn = document.getElementById('close-search');
        const searchInputEl = document.getElementById('search-input');
        const lock = document.getElementById('lock-button');

        const upDown = document.getElementById('upDown')
        const addStation = document.getElementById("add-station");
        let isDown = false;

        const favButton = document.getElementById('fav-button');
        const favListButton = document.getElementById('favlist-button')

        let isFavVisible = false;

        favListButton.addEventListener('click', ()=>{

            isFavVisible = !isFavVisible;

            if(isFavVisible){

            if(favorites.length === 0){
                stationListEl.innerHTML =`
                <div style="padding: 20px; color: black; text-align: center;">
                <p>No favorites saved yet.</p>
                <p style="font-size: 0.8rem; margin-bottom: 15px;">Click the heart at the top when a station is playing to save it.</p>
              
            </div>
                `;
            }else{
                let favHTML = `
            <div style="padding: 15px; color: black;">
                <h3 style="margin: 0 0 10px 0;">My Favorites</h3>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto;">

        `;
        
                favorites.forEach(station => {
            // Re-uses your existing station button styling
            favHTML += `
                <button class="station-btn" style="text-align: left; padding: 10px; border-radius: 4px; border: 1px solid #ccc; background: white; cursor: pointer;" 
                        onclick="('${station.url}')">
                    <span style="font-weight: bold;">${station.name}</span>
                </button>
            `;})

                    favHTML += `
                </div></div>
        `;

        stationListEl.innerHTML = favHTML;

            }
        }else{
            if(currentFocusedCity){
                renderSidebarList(currentFocusedCity.staions);
            }else{
                stationListEl.innerHTML='<span style="font-size: 1rem; color: #000000; padding: 20px;">No station selected</span>';
            }
        }

        })


        let favorites = JSON.parse(localStorage.getItem('liteRadioFavs'))||[];
        favButton.addEventListener('click',()=>{
            if (stationName === "lite"){
                favButton.style.display ='none';
            }else{favButton.style.display='block'}

            const streamUrl = document.getElementById('audioPlayer').src;

            const existingIndex = favorites.findIndex(fav=> fav.url === streamUrl);
            const heartIcon = favButton.querySelector('i');

            if (existingIndex>-1){
                favorites.splice(existingIndex, 1);
                heartIcon.classList.remove('fa-solid');
                heartIcon.classList.add('fa-regular');
                heartIcon.style.color="black"
            }else{
                favorites.push({name: stationName, url:streamUrl});
                heartIcon.classList.remove('fa-regular');
                heartIcon.classList.add('fa-solid');
                heartIcon.style.color="#00ff00";
            }

            localStorage.setItem('liteRadioFavs',JSON.stringify(favorites))

            
        })

        // Add this wherever you update the currently playing station
function updateHeaderFavoriteState(streamUrl) {
    const heartIcon = document.getElementById('fav-button').querySelector('i');
    
    // Check if the current stream exists in our saved favorites
    const isFavorite = favorites.some(fav => fav.url === streamUrl);
    
    if (isFavorite) {
        heartIcon.classList.remove('fa-regular');
        heartIcon.classList.add('fa-solid');
        heartIcon.style.color = "red";
    } else {
        heartIcon.classList.remove('fa-solid');
        heartIcon.classList.add('fa-regular');
        heartIcon.style.color = "black";
    }
}


        function toggleFavorite(stationName, streamUrl){
            const existingIndex = favorites.findIndex(fav => fav.url === streamUrl);

            if(existingIndex > -1){
                favorites.splice(existingIndex, 1);
            }else{
                favorites.push({name: stationName, url: streamUrl});
            }

            localStorage.setItem('liteRadioFavs', JSON.stringify(favorites));
        }



        window.removeFavoriteFromUI = function(url){
            toggleFavorite('',url);
            document.getElementById('fav-btn').click();
        }

        function debounce(func, wait){
            let timeout;
            return function(...args){
                clearTimeout(timeout);
                timeout = setTimeout(()=>func.apply(this, args), wait);
            }
        }

        upDown.addEventListener('click',()=>{
            isDown = !isDown;
            if (isDown){
                stationListEl.style.display = 'none';
                upDown.innerHTML = '<i class="fa-solid fa-angle-up fa-xs"></i>'
            }else{
                stationListEl.style.display = 'block';
                upDown.innerHTML = '<i class="fa-solid fa-angle-down fa-xs"></i>'
            }
        })

        addStation.addEventListener('click', ()=>{

            
            stationListEl.innerHTML = `
            <div style="padding: 15px; color: black;display: flex;flex-direction: column;gap: 10px;">
                    <h3 style="margin: 0 0 10px 0;">Add to Global Database</h3>
                    <form id="new-station-form" style="display: flex;flex-direction: column;gap: 10px;">
                        <input type="text" id="ns-name" placeholder="Station Name (e.g. Hiru FM)" required style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                <input type="url" id="ns-url" placeholder="Stream URL (http://...)" required style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                <input type="url" id="ns-homepage" placeholder="Station Website URL" required style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
               <input list="location-list" id="ns-location-search" placeholder="Type city name..." required autocomplete="off" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc; outline: none;">
                <datalist id="location-list"></datalist>

                <input type="text" id="ns-country" placeholder="Country" required style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                <input type="text" id="ns-city" placeholder="City"  required style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                <input type="text" id="ns-lang" placeholder="Language (e.g. Sinhala)" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">

                <!-- Hidden coordinate fields -->
                <input type="hidden" id="ns-lat">
                <input type="hidden" id="ns-lng">

                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button type="submit"  class="form-btn"  style="flex: 1; padding: 4px; background: #00ff00; color: black; border-radius: 4px;">Submit</button>
                    <button type="button" class="form-btn" id="ns-cancel"  style="flex: 1; padding: 8px; background: #ddd; color: black; border-radius: 4px;">Cancel</button>
                </div>
                <div id="ns-status" style="font-size: 0.8rem; text-align: center; margin-top: 5px;"></div>
                    </form>
                </div>
            `;

            const searchInput = document.getElementById('ns-location-search');
            const dataList = document.getElementById('location-list');
            let lastFetchedPlaces=[];

            searchInput.addEventListener('input',debounce(async(e)=>{

            
                const query = e.target.value;
                if (query.length < 3) return;

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`);
                    lastFetchedPlaces = await res.json();

                    dataList.innerHTML = lastFetchedPlaces.map(place=>
                        `<option value="${place.name}, ${place.address.country || ''}">`
                    ).join('');
                }catch(err){
                    console.error("OSM Fetch Error:", err);
                }
            },600));

            searchInput.addEventListener('change',(e)=>{
                const query = e.target.value;
                const selectedPlace = lastFetchedPlaces.find(p => `${p.name}, ${p.address.country || ''}` === query)
                
                if (selectedPlace){
            document.getElementById('ns-city').value = selectedPlace.name || selectedPlace.address.city || selectedPlace.address.town || "Unknown";
            document.getElementById('ns-country').value = selectedPlace.address.country || "Unknown";
            // Fill hidden coordinate fields for your 3D globe
            document.getElementById('ns-lat').value = selectedPlace.lat;
            document.getElementById('ns-lng').value = selectedPlace.lon;
                }
            })

            document.getElementById('ns-cancel').addEventListener('click',()=>{
                if(currentFocusedCity){
                    renderSidebarList(currentFocusedCity.stations);
                    
                }else{
                    stationListEl.innerHTML = '<span class="empty-state">No station selected</span>';
                }
            })

            document.getElementById('new-station-form').addEventListener('submit',(e)=>{
                e.preventDefault();

                const statusText = document.getElementById('ns-status');
                statusText.textContent = "Validating stream... plaese wait.";
                statusText.style.color = "blue";

                const payload = {
                    name: document.getElementById('ns-name').value,
                    url: document.getElementById('ns-url').value,
                    homepage: document.getElementById('ns-homepage').value,
                    city: document.getElementById('ns-city').value,
                    country: document.getElementById('ns-country').value,
                    lat: parseFloat(document.getElementById('ns-lat').value) || 0,
                    lng: parseFloat(document.getElementById('ns-lng').value) || 0,
                    language: document.getElementById('ns-lang').value
                };

                if (payload.lat === 0 && payload.lng === 0 ){
                    statusText.textContent = "Please select a valid city from the search suggestions.";
                    statusText.style.color = "red";
                    return
                }

                fetch('/api/add/station',{
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                })
                .then(async (response)=>{
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || "Failed to add station");

                    let existingCity = cities.find(c=> c.name.toLowerCase() === payload.city.toLowerCase());

                    if(existingCity){
                        existingCity.stations.push({name: payload.name,url: payload.url});

                        if (currentFocusedCity && currentFocusedCity.name.toLowerCase() === existingCity.name.toLowerCase()){
                            renderSidebarList(existingCity.stations);
                        }else{

                            const newCity = {
                                name :payload.name,
                                country: payload.country,
                                lat: payload.lat,
                                lng: payload.lng,
                                stations: [{name: payload.name, url: payload.url}]
                            };
                            cities.push(newCity);

                            world.pointsData(cities);

                            world.pointOfView({lat: newCity.lat, lng:newCity.lng, altitude: 1.5}, 1500);
                            currentFocusedCity = newCity;
                            cityNameEl.textContent = `${newCity.name}, ${newCity.country}`;
                            renderSidebarList(newCity.stations)
                        }
                    }

                    statusText.textContent = "Success! Station verified and added";
                    statusText.style.color = "green";
                    setTimeout(()=> document.getElementById('ns-cancel').click(),2000);
                })
                .catch(error=>{
                    statusText.textContent = "Error: " + error.message;
                    statusText.style.color = "red";
                })

            })

            document.getElementById('new-station-form').addEventListener('submit',(e)=>{
                e.preventDefault();

                const statusText = document.getElementById('ns-status');
                statusText.textContent = "Validating stream... please wait.";
                statusText.style.color="blue"

                const payload = {
                    
                }
        })
        })




        searchTrigger.addEventListener('click',()=>{
            defaultActions.style.display = 'none';
            searchContainer.style.display = 'flex';
            searchInputEl.focus();
        })



        closeSearchBtn.addEventListener('click',()=>{
            searchContainer.style.display = 'none';
            defaultActions.style.display = 'flex';

           // searchInputEl.value = '';
            //searchInputEl.dispatchEvent(new Event('input'));
        })


        playPauseButton.addEventListener('click',()=>{
            
            if (audioPlayer.paused){
                audioPlayer.play()
            }else{
                audioPlayer.pause()
            }
        });

        volumeSlider.addEventListener('input',(e)=>{
            audioPlayer.volume = e.target.value;
        })

        audioPlayer.addEventListener("waiting", ()=>{playPauseButton.innerHTML='<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>';})

        audioPlayer.addEventListener("loadstart", ()=>{playPauseButton.innerHTML='<i class="fa-solid fa-play fa-sm"></i>';})

        audioPlayer.addEventListener("playing",()=> {
        playPauseButton.innerHTML = '<i class="fa-solid fa-pause fa-sm"></i>';})

        audioPlayer.addEventListener('pause', () => {
            playPauseButton.innerHTML ='<i class="fa-solid fa-play fa-sm"></i>';});

let cities=[];
let world; 
let isAutoFlying = false;

        let isLocked = false;

        lock.addEventListener('click', () => {
    isLocked = !isLocked;
    console.log(isLocked)
    
    if (isLocked) {
        lock.innerHTML = '<i class="fa-solid fa-lock fa-xs"></i>';
        lock.style.color = '#00ffcc'; // Highlight green when locked
    } else {
        lock.innerHTML = '<i class="fa-solid fa-unlock fa-xs"></i>';
        lock.style.color = 'black'; // Revert to your default button color
    }
});

            function getDistance(lat1, lon1, lat2, lon2){
                const R = 6371;
                const dLat=(lat2-lat1)*Math.PI/180;
                const dLon=(lon2-lon1)*Math.PI/180;
                const a = Math.sin(dLat/2)*Math.sin(dLat/2)+
                          Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);

                return R*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
            }

            const crosshairEl = document.getElementById('crosshair');
            let currentFocusedCity = null
        
            function triggerPlay(station, btnElement){
              if (isLocked) return;
              
                if (btnElement){
                    const allBtns = stationListEl.querySelectorAll('.station-btn');
                    allBtns.forEach(b=>b.classList.remove('active'));
                    btnElement.classList.add('active');
                }
                playPauseButton.disabled = false;
                stationName.textContent = station.name;
                playPauseButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>';

              
                audioPlayer.src = station.url;
                audioPlayer.load();
               audioPlayer.play();
            
            }

            function renderSidebarList(stations){

               
                stationListEl.innerHTML = '';

                if (!stations || stations.length ===0){
                   stationListEl.innerHTML = '<span class="empty-state">No stations in range</span>';
                    return;
                }

                stations.forEach(station=>{
                    const btn = document.createElement('button');
                    btn.className = 'station-btn';
                 
                    btn.innerHTML = `
            <span class="station-label">${station.name}</span>
            <div class="eq-bars">
                <div class="eq-bar"></div>
                <div class="eq-bar"></div>
                <div class="eq-bar"></div>
            </div>
        `;


        // When clicked, trigger the play helper
        btn.onclick = () => triggerPlay(station, btn);
        stationListEl.appendChild(btn);
                })
            }

            function autoPlayFirst(stations){
if(isLocked){return}
               
                if (stations && stations.length > 0 && stationListEl.firstChild){
                    triggerPlay(stations[0], stationListEl.firstChild);

                }
            }


            // HELPER 4: Jumps to a city, builds the sidebar, and plays a specific station
function jumpToStation(city, targetStation) {
    isAutoFlying = true;
    // 1. Lock the city so the globe's 'end' event ignores this flight
    currentFocusedCity = city;
    lastRenderedCity = city;

    crosshairEl.classList.add('locked');
    world.pointsData(world.pointsData());
    
    // 2. Fly the globe to the destination
    world.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.5 }, 1000);
    
    // 3. Update UI and immediately render the sidebar list
    if(!isLocked){cityNameEl.textContent = `${city.name}, ${city.country}`;}
    renderSidebarList(city.stations);
    
    // 4. Find the matching button in the newly rendered list to highlight its EQ bars
    const allBtns = stationListEl.querySelectorAll('.station-btn');
    let buttonToHighlight = allBtns[0]; // Fallback to first
    
    allBtns.forEach(btn => {
        if (btn.querySelector('.station-label').textContent === targetStation.name) {
            buttonToHighlight = btn;
        }
    });

    // 5. Use your existing helper to play the audio and start the animation
    triggerPlay(targetStation, buttonToHighlight);

    setTimeout(()=>{
        isAutoFlying = false;
    },1100)
        startLocalClock(city.lat, city.lng)
}


        // Fetching dynamically from the Go API
        fetch('/api/cities')
            .then(response => response.json())
            .then(data => {
                cities = data
                 world = Globe()
                    (document.getElementById('globe-container'))
                    //.globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    
                    .globeMaterial(material)
                    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                    .backgroundImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
                    .pointsData(cities)
                    .pointLat(d => d.lat)
                    .pointLng(d => d.lng)
                    .pointColor(d => d === currentFocusedCity ? '#fff' : '#00ffcc')
                    .pointAltitude(0.005)
                    .pointRadius(d=>d===currentFocusedCity ? 0.3 : 0.2)
                    .pointLabel(d => `${d.name}, ${d.country}`)
                    .onPointClick(city => {
                        searchInput.value='';
                        isDown = true;
                        stationListEl.style.display = 'block'
                        upDown.innerHTML = '<i class="fa-solid fa-angle-down fa-xs"></i>' 
                     if(!isLocked){  cityNameEl.textContent = `${city.name}, ${city.country}`;}
                        
                        world.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.5 }, 2500);
                        renderSidebarList(city.stations);
                        autoPlayFirst(city.stations);
                        startLocalClock(city.lat,city.lng)
                       
                    });

                const globeContainer = document.getElementById('globe-container');
                const resizeGlobe = () => {
                    world.width(globeContainer.clientWidth);
                    world.height(globeContainer.clientHeight);
                };
                window.addEventListener('resize', resizeGlobe);
                resizeGlobe();

                // --- 1. INITIAL LOAD FLY-TO ---
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    
                    let closestCity = null;
                    let minDistance = Infinity;

                    // Find the city in the database closest to the user
                    cities.forEach(city => {
                        const dist = getDistance(userLat, userLng, city.lat, city.lng);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestCity = city;
                        }
                    });

                    if (closestCity) {
                        isAutoFlying = true;
                        // Fly to the closest city over 2.5 seconds
                        world.pointOfView({ lat: closestCity.lat, lng: closestCity.lng, altitude: 1.5 }, 2500);
                        
                        // Wait for the flight to finish, then lock on and play
                        setTimeout(() => {
                            currentFocusedCity = closestCity;
                            crosshairEl.classList.add('locked');
                            world.pointsData(cities); 
                            
                        if(!isLocked){    cityNameEl.textContent = `${closestCity.name}, ${closestCity.country}`;}

                            // 1. Draw the sidebar list
                            renderSidebarList(closestCity.stations);
                            
                            // 2. Cue the first station without playing it
                            if (closestCity.stations && closestCity.stations.length > 0) {
                                const firstStation = closestCity.stations[0];
                                
                                // Load the audio into the player
                                audioPlayer.src = firstStation.url;
                                audioPlayer.load();
                                
                                // Update the bottom UI
                                stationName.textContent = firstStation.name;
                                playPauseButton.disabled = false;
                                playPauseButton.innerHTML = '<i class="fa-solid fa-play fa-sm"></i>';
                                
                                // Highlight the first button in the list
                                if (stationListEl.firstChild) {
                                    stationListEl.firstChild.classList.add('active');
                                }
                            }
                            
                            isAutoFlying = false;
                        }, 2600);
                    }
                },
                (error) => {
                    // Fallback if the user denies location access: Fly to Colombo
                    world.pointOfView({ lat: 6.9271, lng: 79.8612, altitude: 1.5 }, 2500);
                }
            );
        }

                world.controls().autoRotate = false;
                world.controls().autoRotateSpeed = 0;

                world.controls().addEventListener('change',()=>{
                   if (isAutoFlying) return;
                    isDown = true;
                    stationListEl.style.display = 'block'
                        upDown.innerHTML = '<i class="fa-solid fa-angle-down fa-xs"></i>' 
                    const {lat, lng} = world.pointOfView();
                   
                    let closestCity = null;
                    let minDistance = Infinity;

                    cities.forEach(city =>{
                        const dist = getDistance(lat, lng,city.lat,city.lng)
                        if(dist<minDistance){
                            minDistance=dist;
                            closestCity=city;
                        }
                    });

                    if (minDistance<300){
                        if (closestCity !== currentFocusedCity){
                            currentFocusedCity = closestCity;
                            
                            crosshairEl.classList.add('locked');
                            world.pointsData(cities);

                          if(!isLocked)  {cityNameEl.textContent = `${closestCity.name}, ${closestCity.country}`;}
                            stationListEl.innerHTML = ''
                 
                        closestCity.stations.forEach((station) => {
                            const btn = document.createElement('button');
                            btn.className = 'station-btn';
                           // btn.textContent = `${station.name}`;

                            btn.innerHTML = `
                    <span class="station-label">${station.name}</span>
                    <div class="eq-bars">
                        <div class="eq-bar"></div>
                        <div class="eq-bar"></div>
                        <div class="eq-bar"></div>
                    </div>
                `;
               

                            btn.onclick = () => {

                                // Remove 'active' class from all buttons in the list
                    const allBtns = stationListEl.querySelectorAll('.station-btn');
                    allBtns.forEach(b => b.classList.remove('active'));
                    if(!isLocked){
                    // Add 'active' class to the clicked button
                    btn.classList.add('active');

                                playPauseButton.disabled = false
                                stationName.textContent=`${station.name}`;
                                playPauseButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>'
                                audioPlayer.src = station.url;
                               
                                audioPlayer.load()
                                audioPlayer.play();
                    }
                            };
                            stationListEl.appendChild(btn);
                        });
                            if(closestCity.stations && closestCity.stations.length>0 && !isLocked){
                                playPauseButton.disabled = false;
                                stationName.textContent = `${closestCity.stations[0].name}`;
                                
                                audioPlayer.src = closestCity.stations[0].url;
                                
                                // This works now because the buttons were appended in step 2
                               stationListEl.firstChild.classList.add('active');
                                
                                audioPlayer.load();
                               audioPlayer.play();
                              
                           
                            }

                        }
                    }else{
                        if (currentFocusedCity !==null){
                            currentFocusedCity = null;
                            crosshairEl.classList.remove('locked');
                            world.pointsData(cities);

                            
                            stationListEl.innerHTML = '<span class="empty-state">No stations in range</span>';
                        }
                    }
                })

                

                world.controls().addEventListener('end',()=>{
                    if (isAutoFlying) return;
                    isDown = true;
                    stationListEl.style.display = 'block'
                        upDown.innerHTML = '<i class="fa-solid fa-angle-down fa-xs"></i>' 
                    if (currentFocusedCity){
                        const currentAltitude = world.pointOfView().altitude;

                        world.pointOfView({
                            lat: currentFocusedCity.lat,
                            lng: currentFocusedCity.lng,
                            altitude: currentAltitude
                        },400)
                         if(currentFocusedCity !== lastRenderedCity){
                            renderSidebarList(currentFocusedCity.stations);
                            if (isLocked) return
                            autoPlayFirst(currentFocusedCity.stations);
                          //  stationListEl.firstChild.classList.add('active')
                            lastRenderedCity=currentFocusedCity;
                            
                         }
                          startLocalClock(currentFocusedCity.lat,currentFocusedCity.lng)
                    }
                });

                searchInput.addEventListener('input',(e)=>{
                    const query = e.target.value.trim().toLowerCase();
                    stationListEl.innerHTML='';

                
                    if (query === ''){
                        cityNameEl.textContent = "Click a city marker";
                        stationListEl.innerHTML = '<span class="empty-state">No Station Selected</span>'
                        return;
                    }
                    isDown = true;
                    stationListEl.style.display = 'block'
                        upDown.innerHTML = '<i class="fa-solid fa-angle-down fa-xs"></i>' 
                    cityNameEl.textContent = `Search Results: ${query}`;
                    let resultsFound = 0;
                    const maxSearchResults = 50;

                    for(const city of cities){
                        for(const station of city.stations || []){
                            if (station.name.toLowerCase().includes(query) || city.name.toLowerCase().includes(query)){
                             
                                const btn = document.createElement('button');
                                btn.className='station-btn';
                                btn.innerHTML = `<strong>▶ ${station.name}</strong><br><span style="font-size: 0.75rem; color: #888;">${city.name}, ${city.country}</span>`;
                                btn.onclick = () =>  {
                                jumpToStation(city, station)
                               searchContainer.style.display = 'none';
                               defaultActions.style.display='flex';
                               searchInput.value = ''
                                }
                                stationListEl.appendChild(btn);
                                resultsFound++;
                                if(resultsFound >=maxSearchResults) break;
                            }
                        }
                        if(resultsFound >= maxSearchResults) break;
                    }
                        if(resultsFound===0){
                            stationListEl.innerHTML = '<span class="empty-state">No stations found.</span>';
                        }else if(resultsFound===maxSearchResults){
                            const resultsLimit = document.createElement('span');
                            resultsLimit.className = 'empty-state';
                            resultsLimit.textContent='Showing first 50 results. Refine your search for more.';
                            stationListEl.appendChild(resultsLimit);
                        }
                })
            })
            .catch(err => console.error('Error loading stations:', err));