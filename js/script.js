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
let currentSearch ="Tacos, comida, restaurantes"

async function initMap() {
  const defaultLocation = center;
    const { Place, getPhotoUrl } = await google.maps.importLibrary("places");
    getPhotoUrlFunction = getPhotoUrl; 
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 14,
        mapId: "ITSNCG-MAP", 
    });
    
    infoWindow = new google.maps.InfoWindow();
    findPlaces(currentSearch);
}

function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];

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
                <div class="rating text-warning">⭐ ${place.rating || 'N/A'}</div>
            </div>
        `;

   
        infoWindow.setContent(content);
        infoWindow.open({
            anchor: marker,
            map: map,
            shouldFocus: false, 
        });
        
        
        map.panTo(place.location);
    });
}


async function findPlaces(searchText) {
  clearMarkers(); 

  const { Place } = await google.maps.importLibrary("places");
  
  const request = {
    textQuery: searchText,
    //NOTA ENTRE MÁS DATOS SE PIDA DEL LOCAL, MÁS CARO SALE LA PETICIÓN
    //OBTENER Más datos: https://developers.google.com/maps/documentation/places/web-service/data-fields?hl=en
    fields: [
        "displayName", "location", "businessStatus", "rating", "photos", "formattedAddress",
       //"nationalPhoneNumber","priceLevel","reviews"
    ],
    //includedType: "restaurant",
    locationBias: center,
    isOpenNow: true,
    language: "es-MX",
    maxResultCount: 20,
    //minRating: 3.2,
    region: "mx",
    useStrictTypeFiltering: false,
  };

  const { places } = await Place.searchByText(request);
  const { LatLngBounds } = await google.maps.importLibrary("core");
  const bounds = new LatLngBounds();


  if (places.length) {
    console.log("Resultados de Places (New):", places);

    for (const place of places) {
        await addMarkerAndDisplay(place, bounds);
    }
    
    map.fitBounds(bounds);
    
  } else {
    console.log("No se encontraron resultados para la búsqueda.");
    if (restaurantListElement) {
        restaurantListElement.innerHTML = `<p class='text-center mt-4'>No se encontraron resultados para "${searchText}".</p>`;
    }
  }
}
async function displayRestaurant(place) {
    if (!restaurantListElement) return;

    let photoUrl = "";
    
    if (place.photos && place.photos.length > 0) {
        //console.log("URL",place.photos[0])
        photoUrl = place.photos[0].getURI({ 
            //photo: place.photos[0], 
            maxWidth: 500, 
            maxHeight: 200 
        });
    }
    let statusText = place.businessStatus === 'OPERATIONAL' ? 
        '<span class="text-success fw-bold">Abierto</span>' : 
        '<span class="text-danger fw-bold">Estado Desconocido</span>';

    const card = `
        <div class="restaurant-card p-3" onclick="map.panTo({lat: ${place.location.lat}, lng: ${place.location.lng}}); map.setZoom(17);">
            <img src="${photoUrl}" class="w-100 restaurant-img" alt="${place.displayName}" loading="lazy">
            <h6 class="mt-3 mb-1 fw-bold">${place.displayName}</h6>
            <p class="mb-1 text-muted">
                ${place.formattedAddress || 'Dirección no disponible'}
            </p>
            <p class="mb-2 text-muted">
                ${statusText} 
            </p>
            <div class="rating text-warning">⭐ ${place.rating || 'N/A'}</div>
        </div>
    `;

    restaurantListElement.innerHTML += card;
}

async function searchCityAndPlaces(cityName) {
   
    const { Geocoder } = await google.maps.importLibrary("geocoding");
    const geocoder = new Geocoder();

  
    geocoder.geocode({ address: cityName }, (results, status) => {
        if (status === "OK" && results[0]) {
           
            const newLocation = results[0].geometry.location;
            
          
            center.lat = newLocation.lat();
            center.lng = newLocation.lng();

           
            map.setCenter(newLocation);
        
            findPlaces(currentSearch); 

        } else {
            console.error("Geocoding falló con el estado:", status);
            alert(`No se pudo encontrar la ubicación para "${cityName}": ${status}`);
        }
    });
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
});
