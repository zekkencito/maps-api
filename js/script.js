       //NOTAAA ** LAS IAs NO ESTÁN ENTRENADAS PARA ESTA VERSIÓN DE MAPS,
        //FAVOR DE VERIFICAR LA DOCUMENTACIÓN
        // no olvidar habilitar Maps Service, places Service (new) y geolocation services
        //https://developers.google.com/maps/documentation/javascript/examples/place-text-search#maps_place_text_search-javascript

        //https://developers.google.com/maps/documentation/javascript/examples/place-photos
       
       let map;
        let service; 
        let markers = [];
        let infoWindow; 
        const center = { lat: 30.378746, lng: -107.880062 }; 
        const restaurantListElement = document.getElementById("restaurants-list");
        let getPhotoUrlFunction;
        let currentSearch ="Tacos, Comida, Restaurantes, ";
        let allPlaces = []; 
        let centerMarker = null;
        let radiusCircle = null;
        let distanceLines = [];
        let currentRadius = 5000; 
        let avgCenter = null; 

        async function initMap() {
            const { Map } = await google.maps.importLibrary("maps");
            const { Place } = await google.maps.importLibrary("places");
            
            map = new Map(document.getElementById("map"), {
                center: center,
                zoom: 14,
                mapId: "ITSNCG-MAP", 
                disableDefaultUI: true,
                zoomControl: true,
                fullscreenControl: true,
            });
            
            infoWindow = new google.maps.InfoWindow();
            await searchCityAndPlaces(document.getElementById("location-input").value);
        }

        function clearMarkers() {
            markers.forEach((marker) => marker.map = null); 
            markers = [];

            if (centerMarker) {
                centerMarker.map = null;
                centerMarker = null;
            }

            if (radiusCircle) {
                radiusCircle.setMap(null);
                radiusCircle = null;
            }

            distanceLines.forEach(line => line.setMap(null));
            distanceLines = [];

            if (infoWindow) infoWindow.close();
            if (restaurantListElement) {
                restaurantListElement.innerHTML = "";
            }
        }

        async function addMarkerAndDisplay(place, bounds) {
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        
            const marker = new AdvancedMarkerElement({
                map,
                position: place.location,
                title: place.displayName,
            });

            bounds.extend(place.location);
            markers.push(marker);
            displayRestaurant(place); 
    
            marker.addListener("click", () => {
                infoWindow.close(); 

                const content = `
                    <div class="info-window-content">
                        <h6 class="fw-bold">${place.displayName}</h6>
                        <p class="mb-1">${place.formattedAddress || 'Dirección no disponible'}</p>
                        <div class="rating">⭐ ${place.rating || 'N/A'} (${place.userRatingCount || 0})</div>
                    </div>
                `;
                
                infoWindow.setContent(content);
                infoWindow.open({
                    anchor: marker,
                    map: map,
                });
                
                map.panTo(place.location);
            });
        }

        async function findPlaces(searchText) {
            clearMarkers(); 
            allPlaces = [];
            avgCenter = null;
            restaurantListElement.innerHTML = `<p class="text-center text-muted mt-4">Buscando "${searchText}"...</p>`;

            const { Place } = await google.maps.importLibrary("places");
            
            const request = {
                textQuery: searchText,
                    //NOTA ENTRE MÁS DATOS SE PIDA DEL LOCAL, MÁS CARO SALE LA PETICIÓN
                     //OBTENER Más datos: https://developers.google.com/maps/documentation/places/web-service/data-fields?hl=en
                fields: [
                    "displayName", "location", "businessStatus", "rating", "photos", 
                    "formattedAddress", "userRatingCount"
                ],
                locationBias: center, 
                isOpenNow: true,
                language: "es-MX",
                maxResultCount: 20,
                region: "mx",
            };

            try {
                const { places } = await Place.searchByText(request);
                
                if (places.length) {
                    console.log("Resultados de Places:", places);
                    allPlaces = places.filter(p => p.location); 
                    applyFiltersAndDisplay(); 
                } else {
                    restaurantListElement.innerHTML = `<p class='text-center mt-4'>No se encontraron resultados para "${searchText}".</p>`;
                }
            } catch (error) {
                restaurantListElement.innerHTML = `<p class='text-center text-danger mt-4'>Error al buscar lugares.</p>`;
            }
        }

        async function displayRestaurant(place) {
            if (!restaurantListElement) return;

            let photoUrl = "https://placehold.co/400x200/eee/ccc?text=Sin+Foto"; 
            
            if (place.photos && place.photos.length > 0) {
                try {
                    photoUrl = place.photos[0].getURI({ maxWidth: 400, maxHeight: 200 });
                } catch (e) {
                    console.warn("No se pudo cargar la foto:", e);
                }
            }
            
            let statusText = place.businessStatus === 'OPERATIONAL' ? 
                '<span class="text-success fw-bold">Abierto</span>' : 
                '<span class="text-danger fw-bold">Cerrado o Desconocido</span>';

            const card = `
                <div class="restaurant-card p-3" 
                     onclick="map.panTo({lat: ${place.location.lat()}, lng: ${place.location.lng()}}); map.setZoom(16);">
                    
                    <img src="${photoUrl}" class="w-100 restaurant-img rounded" alt="${place.displayName}" loading="lazy"
                         onerror="this.src='https://placehold.co/400x200/eee/ccc?text=Error+Foto'">
                    
                    <h6 class="mt-3 mb-1 fw-bold">${place.displayName}</h6>
                    <p class="mb-1 text-muted small">
                        ${place.formattedAddress || 'Dirección no disponible'}
                    </p>
                    <p class="mb-2 small">
                        ${statusText} 
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="rating">⭐ ${place.rating || 'N/A'}</div>
                        <div class="reviews text-muted small"><i class="fa fa-comment"></i> ${place.userRatingCount || 0}</div>
                    </div>
                </div>
            `;
            restaurantListElement.innerHTML += card;
        }

        async function searchCityAndPlaces(cityName) {
            const { Geocoder } = await google.maps.importLibrary("geocoding");
            const geocoder = new Geocoder();

            try {
                const { results } = await geocoder.geocode({ address: cityName, region: "MX" });
                
                if (results && results[0]) {
                    const newLocation = results[0].geometry.location;
                    center.lat = newLocation.lat();
                    center.lng = newLocation.lng();

                    map.setCenter(newLocation);

                    await findPlaces(currentSearch); 
                } else {
                    console.error("Geocoding falló.");
                    alert(`No se pudo encontrar la ubicación para "${cityName}".`);
                }
            } catch (error) {
                console.error("Error en Geocoding:", error);
                alert(`Error al buscar "${cityName}": ${error.message}`);
            }
        }
        

        // --- FUNCIONES DE FILTRADO ---

        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371e3; 
            const φ1 = lat1 * Math.PI/180;
            const φ2 = lat2 * Math.PI/180;
            const Δφ = (lat2-lat1) * Math.PI/180;
            const Δλ = (lon2-lon1) * Math.PI/180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; 
        }


        function calculateAverageCenter(places) {
            if (places.length === 0) return null;
            
            const total = places.reduce((acc, place) => {
                if (place.location && typeof place.location.lat === 'function') {
                    acc.lat += place.location.lat();
                    acc.lng += place.location.lng();
                }
                return acc;
            }, { lat: 0, lng: 0 });

            return {
                lat: total.lat / places.length,
                lng: total.lng / places.length
            };
        }


        async function createCenterMarker(position) {
            const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
            const pin = new PinElement({
                background: '#007bff', 
                borderColor: '#ffffff',
                glyphColor: '#ffffff',
                glyph: '⭐' 
            });

            if (centerMarker) centerMarker.map = null; 

            centerMarker = new AdvancedMarkerElement({
                map,
                position,
                title: 'Centro Promedio',
                content: pin.element, 
                zIndex: 1000 
            });
        }

        async function drawRadiusCircle(center, radius) {
            const { Circle } = await google.maps.importLibrary("maps");
            if (radiusCircle) {
                radiusCircle.setMap(null);
            }
            radiusCircle = new Circle({
                strokeColor: "#007bff",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#007bff",
                fillOpacity: 0.15,
                map,
                center,
                radius: radius, 
            });
        }

        async function drawDistanceLines(center, places) {
            const { Polyline } = await google.maps.importLibrary("maps");
            distanceLines.forEach(line => line.setMap(null));
            distanceLines = [];

            if (places.length < 1) return;

            let nearest = null;
            let farthest = null;
            let minDistance = Infinity;
            let maxDistance = -1;

            places.forEach(place => {
                const distance = calculateDistance(center.lat, center.lng, place.location.lat(), place.location.lng());
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = place;
                }
                if (distance > maxDistance) {
                    maxDistance = distance;
                    farthest = place;
                }
            });

            if (nearest) {
                const nearestLine = new Polyline({
                    path: [center, nearest.location], 
                    geodesic: true,
                    strokeColor: '#28a745',
                    strokeOpacity: 1.0,
                    strokeWeight: 3,
                    map: map
                });
                distanceLines.push(nearestLine);
            }

            if (farthest) {
                const farthestLine = new Polyline({
                    path: [center, farthest.location], 
                    geodesic: true,
                    strokeColor: '#dc3545',
                    strokeOpacity: 1.0,
                    strokeWeight: 3,
                    map: map
                });
                distanceLines.push(farthestLine);
            }
        }

        function filterPlacesByRadius(places, center, radius) {
            if (!center) return places; 
            
            return places.filter(place => {
                const distance = calculateDistance(center.lat, center.lng, place.location.lat(), place.location.lng());
                return distance <= radius;
            });
        }

        async function displayAllPlaces(places) {
            restaurantListElement.innerHTML = "";
            markers.forEach((marker) => marker.map = null);
            markers = [];

            const { LatLngBounds } = await google.maps.importLibrary("core");
            const bounds = new LatLngBounds();

            if (places.length > 0) {
                for (const place of places) {
                    addMarkerAndDisplay(place, bounds);
                }
                if (centerMarker && centerMarker.position) {
                    bounds.extend(centerMarker.position);
                }
                map.fitBounds(bounds); 
            } else {
                restaurantListElement.innerHTML = `<p class='text-center mt-4'>No se encontraron lugares dentro del radio seleccionado.</p>`;
                if(avgCenter) map.panTo(avgCenter); 
            }
        }

        function sortPlacesByRating() {
            allPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            applyFiltersAndDisplay();
        }

        function sortPlacesByReviews() {
            allPlaces.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));
            applyFiltersAndDisplay();
        }

        async function applyFiltersAndDisplay() {
            if (allPlaces.length === 0) {
                displayAllPlaces([]);
                return;
            }
            if (!avgCenter) {
                avgCenter = calculateAverageCenter(allPlaces);
            }
            if (centerMarker) centerMarker.map = null;
            if (avgCenter) {
                await createCenterMarker(avgCenter);
            }
            const filteredPlaces = filterPlacesByRadius(allPlaces, avgCenter, currentRadius);
            
            await displayAllPlaces(filteredPlaces);

            if (avgCenter) {
                await drawRadiusCircle(avgCenter, currentRadius);
                await drawDistanceLines(avgCenter, filteredPlaces);
            }
        }


        document.addEventListener("DOMContentLoaded", () => {
            const searchButton = document.getElementById("search-btn");
            const locationInput = document.getElementById("location-input");
            
            if (searchButton && locationInput) {
                searchButton.addEventListener("click", () => {
                    const searchText = locationInput.value.trim();
                    if (searchText) {
                        searchCityAndPlaces(searchText); 
                    }
                });
                
                locationInput.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        searchButton.click();
                    }
                });
            }

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const currentActive = document.querySelector('.nav-link.active');
                    if(currentActive) currentActive.classList.remove('active');
                    e.target.classList.add('active');
                    
                    currentSearch = e.target.getAttribute('data-search');
                    
                    findPlaces(currentSearch);
                });
            });

            const sortRatingButton = document.getElementById('sort-rating');
            if (sortRatingButton) {
                sortRatingButton.addEventListener('click', sortPlacesByRating);
            }

            const sortReviewsButton = document.getElementById('sort-reviews');
            if (sortReviewsButton) {
                sortReviewsButton.addEventListener('click', sortPlacesByReviews);
            }

            const radiusSlider = document.getElementById('radius-slider');
            const radiusValue = document.getElementById('radius-value');
            if (radiusSlider && radiusValue) {
                radiusSlider.addEventListener('input', (e) => {
                    currentRadius = parseInt(e.target.value, 10);
                    radiusValue.textContent = currentRadius;
                });
                radiusSlider.addEventListener('change', (e) => {
                    applyFiltersAndDisplay(); 
                });
            }
        });