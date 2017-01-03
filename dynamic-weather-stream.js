"use strict";
// trigger the debugger so that you can easily set breakpoints
//debugger;

var VectorWatch = require('vectorwatch-sdk');

var vectorWatch = new VectorWatch();

var logger = vectorWatch.logger;

var request = require("request");


// { **************** Weather code ******************************


function parseWeatherIcon(icon) {
    var yahoo_icon = '?'; //initialy not defined
    
    switch (icon){
      case "clear-day":
        yahoo_icon = 0xe004; // sunny
        break;
      case "clear-night":
        yahoo_icon = 0xe005; // clear night
        break;
      case "rain":
        yahoo_icon = 0xe00b; // showers
        break;
      case "snow":
        yahoo_icon = 0xe00f; // snow
        break;
      case "sleet": 
        yahoo_icon = 0xe00c; // sleet
        break;
      case "wind": 
        yahoo_icon = 0xe00a; // windy
        break;
      case "fog": 
        yahoo_icon = 0xe009; // foggy
        break;
      case "cloudy":
        yahoo_icon = 0xe008; // cloudy
        break;
      case "partly-cloudy-day":
        yahoo_icon = 0xe006; // partly cloudy day
        break;
      case "partly-cloudy-night":
        yahoo_icon = 0xe006; // partly cloudy night
        break;
    }
    
    return  String.fromCharCode(yahoo_icon);
}


function getWeather(apiKey, display, coords, format) {
    
    return new Promise(function (resolve, reject) {
        var url;
        if (display == "Weather") {
            
            url= 'https://api.forecast.io/forecast/' + apiKey + '/' + coords + '?exclude=minutely,hourly,daily,alerts,flags&units=' + (format == 'Fahrenheit'? 'us' : 'si');
            
        } else {
            
            var latlong = coords.split(",");
            url = 'http://nominatim.openstreetmap.org/reverse?lat=' + latlong[0] + '&lon=' + latlong[1] + '&format=json&accept-language=en-US';
      
            
        }
       
       
        request(url, function (error, httpResponse, body) {
            if (error) {
                reject('REST call error: ' + error.message + ' for ' + display);
                return;
            }

            if (httpResponse && httpResponse.statusCode != 200) {
                reject('REST call error: ' + httpResponse.statusCode + ' for ' + display);
                return;
            }

            try {
                
               
                
                var json = JSON.parse(body);
                var result = "N/A";
                
                switch (display) {
                    
                    case 'Street Name':
                        if (json.address.road) result = json.address.road;
                        break;
                    case 'City/Town Name':
                        if (json.address.hamlet) result = json.address.hamlet;
                        else if (json.address.village)  result = json.address.village;
                        else if (json.address.town) result = json.address.town;
                        else if (json.address.city) result = json.address.city;
                        break;
                    case 'County/Country Name':
                        if (json.address.county) result = json.address.county;
                        else if (json.address.state) result = json.address.state;
                        else if (json.address.country) result = json.address.country;
          
                        break;
                    case 'Weather':
                        result = parseWeatherIcon(json.currently.icon) + ' ' + Math.round(json.currently.temperature) + '°' + format.charAt(0);
                        break;                        
                }
                
                resolve(result);
         
                //resolve(body);
            } catch(err) {
                reject('Error parsing ' + display + ': ' + err.message);
            }

        });
    });
    
   
    
}




// Get Location lat+lon
function getLocation() {
    
    return new Promise(function (resolve, reject) {
        
      navigator.geolocation.getCurrentPosition(
        function (pos) {
            resolve(pos.coords.latitude + ',' + pos.coords.longitude);
        },
        function (err) {
            reject(err);
        },
        {timeout: 15000, maximumAge: 60000}
      );
   
       
    });
}


// **************** Weather code ****************************** }





// { **************** Configuration Code ************************

vectorWatch.on('config', function(event, response) {
    // your stream was just dragged onto a watch face
    logger.info('on config');

    var apiKey = response.createAutocomplete("ApiKey");
	apiKey.setHint("Enter Dark Sky Api Key");
    apiKey.setDynamic(true);
    apiKey.setAsYouType(45);
    
    var format = response.createGridList('Format');
    format.setHint("Select Temperature Format");
    format.addOption('Fahrenheit');
    format.addOption('Celsius');
    
    var display = response.createGridList('Display');
    display.setHint("Select What to dispplay");
    display.addOption('Weather');
    display.addOption('Street Name');
    display.addOption('City/Town Name');
    display.addOption('County/Country Name');
   

    response.send();
});

vectorWatch.on('subscribe', function(event, response) {
    
    var settings = event.getUserSettings().settings;

    
    getLocation()
    .then(function (coords) {
        return getWeather(settings.ApiKey.name, settings.Display.name, coords, settings.Format.name);
    })
    .then(function (result) {
        response.setValue(result);
        response.send();
    })
    .catch(function(e) {
            logger.error(e);
            response.setValue("ERROR");
            response.send();
    });

});

vectorWatch.on('unsubscribe', function(event, response) {
    // your stream was removed from a watch face
    logger.info('on unsubscribe');
    response.send();
});


vectorWatch.on('schedule', function(records) {
    logger.info('on schedule');

});


// **************** Configuration Code ************************ }




// { **************** Scheduled Code ************************
vectorWatch.on('schedule', function(records) {
    logger.info('on schedule');

    records.forEach(function(record) {
        var settings = record.userSettings;
        
        getLocation()
        .then(function (coords) {
            return getWeather(settings.ApiKey.name, settings.Display.name, coords, settings.Format.name);
        })
        .then(function (result) {
            record.pushUpdate(result);
        })
        .catch(function(e) {
            logger.error(e);
            record.pushUpdate("ERROR");
 
        });
        
    });
});
// **************** Scheduled Code ************************ }
