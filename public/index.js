
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

        audioPlayer.addEventListener("loadstart", ()=>{playPauseButton.innerHTML='<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>';})

        audioPlayer.addEventListener("playing",()=> {
        playPauseButton.innerHTML = '<i class="fa-solid fa-pause fa-sm"></i>';})

        audioPlayer.addEventListener('pause', () => {
            playPauseButton.innerHTML ='<i class="fa-solid fa-play fa-sm"></i>';});


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
                if (stations && stations.length > 0 && stationListEl.firstChild){
                    triggerPlay(stations[0], stationListEl.firstChild);
                }
            }

        // Fetching dynamically from the Go API
        fetch('/api/cities')
            .then(response => response.json())
            .then(cities => {
                const world = Globe()
                    (document.getElementById('globe-container'))
                    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
                    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
                    .pointsData(cities)
                    .pointLat(d => d.lat)
                    .pointLng(d => d.lng)
                    .pointColor(d => d === currentFocusedCity ? '#fff' : '#00ffcc')
                    .pointAltitude(0.005)
                    .pointRadius(d=>d===currentFocusedCity ? 0.3 : 0.2)
                    .pointLabel(d => `${d.name}, ${d.country}`)
                    .onPointClick(city => {
                        searchInput.value='';

                        cityNameEl.textContent = `${city.name}, ${city.country}`;
                        
                        world.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.5 }, 2500);
                        renderSidebarList(city.stations);
                        autoPlayFirst(city.stations);

                       
                    });

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
                        // Fly to the closest city over 2.5 seconds
                        world.pointOfView({ lat: closestCity.lat, lng: closestCity.lng, altitude: 1.5 }, 2500);
                        
                        // Wait for the flight to finish, then lock on and play
                        setTimeout(() => {
                            currentFocusedCity = closestCity;
                            crosshairEl.classList.add('locked');
                            world.pointsData(cities); // Update dot color
                            
                            cityNameEl.textContent = `${closestCity.name}, ${closestCity.country}`;

                            renderSidebarList(closestCity.stations)
                            autoPlayFirst(closestCity.stations)
                        }, 3000);
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

                            cityNameEl.textContent = `${closestCity.name}, ${closestCity.country}`;
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
                    
                    // Add 'active' class to the clicked button
                    btn.classList.add('active');

                                playPauseButton.disabled = false
                                stationName.textContent=`${station.name}`;
                                playPauseButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>'
                                audioPlayer.src = station.url;
                                audioPlayer.load()
                                audioPlayer.play();
                                
                            };
                            stationListEl.appendChild(btn);
                        });
                            if(closestCity.stations && closestCity.stations.length>0){
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

                let lastRenderedCity = null;

                world.controls().addEventListener('end',()=>{
                    if (currentFocusedCity){
                        const currentAltitude = world.pointOfView().altitude;

                        world.pointOfView({
                            lat: currentFocusedCity.lat,
                            lng: currentFocusedCity.lng,
                            altitude: currentAltitude
                        },400)
                         if(currentFocusedCity !== lastRenderedCity){
                            renderSidebarList(currentFocusedCity.stations);
                            autoPlayFirst(currentFocusedCity.station);
                            lastRenderedCity=currentFocusedCity;
                         }
                    }
                });

                searchInput.addEventListener('input',(e)=>{
                    const query = e.target.value.toLowerCase();
                    stationListEl.innerHTML='';

                
                    if (query === ''){
                        cityNameEl.textContent = "Click a city marker";
                        stationListEl.innerHTML = '<span class="empty-state">No Station Selected</span>'
                        return;
                    }

                    cityNameEl.textContent = `Search Results: ${query}`;
                    let resultsFound = 0;

                    cities.forEach(city =>{
                        city.stations.forEach(station=>{
                            if (station.name.toLowerCase().includes(query) || city.name.toLowerCase().includes(query)){
                                resultsFound++;

                                const btn = document.createElement('button');
                                btn.className='station-btn';
                                btn.innerHTML = `<strong>▶ ${station.name}</strong><br><span style="font-size: 0.75rem; color: #888;">${city.name}, ${city.country}</span>`;
                                btn.onclick = () =>  {
                                    stationName.textContent = `${station.name}`
                                    cityNameEl.textContent = `${city.name}, ${city.country}`;
                                    world.pointOfView({lat:city.lat, lng: city.lng, altitude:1.5},1000)
                                    triggerPlay(station,btn)
                                
                                
                                
                                
                            
                                
                                }
                                stationListEl.appendChild(btn);
                            }
                        })
                    })
                        if(resultsFound===0){
                            stationListEl.innerHTML = '<span class="empty-state">No stations found.</span>';
                        }
                })
            })
            .catch(err => console.error('Error loading stations:', err));