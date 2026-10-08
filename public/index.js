
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
                    .pointColor(() => '#00ffcc')
                    .pointAltitude(0.005)
                    .pointRadius(0.2)
                    .pointLabel(d => `${d.name}, ${d.country}`)
                    .onPointClick(city => {
                        searchInput.value='';

                        cityNameEl.textContent = `${city.name}, ${city.country}`;
                        
                        
                        
                        city.stations.forEach(station => {
                            const btn = document.createElement('button');
                            btn.className = 'station-btn';
                            btn.textContent = `${station.name}`;
                            btn.onclick = () => {

                                
                               
                                playPauseButton.disabled = false
                               
                                stationName.textContent=`${station.name}`;
                                playPauseButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>'
                                audioPlayer.src = station.url;
                                audioPlayer.load()
                                audioPlayer.play();
                                
                            };
                            stationListEl.appendChild(btn);
                        });
                    });

                world.controls().autoRotate = false;
                world.controls().autoRotateSpeed = 0;

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
                                    playPauseButton.disabled = false
                                
                                
                                
                                playPauseButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-sm fa-spin"></i>'
                                audioPlayer.src = station.url;
                                audioPlayer.load()
                                audioPlayer.play();
                            
                                
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