# MzkWorldMap

![](https://badgen.net/badge/version/0.8/blue)

Browse a 3D interactive Earth globe to navigate around and select countries. Feeding this module with objects (artists, cars, people ...) per countries will display for each of them a cylinder with a scaled height relative to other countries. It can also give information about the clicked country. With several preferences, this scene can be rendered on many machine with various configuration ; however, the browser must support [WebGL](https://www.khronos.org/webgl/).

<p>
  <img src="/assets/img/screenshots/day.jpg" width="960" height="540" />
</p>

### Get started

To quickly play with this module, there is an `example.html` file which can be opened in any modern web browser (that has WebGL support). This *out of the box* method doesn't require a web server, but since *MzkWorldMap* needs to fetch its ressources, you have to disable the CORS policy of your browser*:

- Firefox (*about:config*) : `security.fileuri.strict_origin_policy = false`
- Chrome (*argument to pass*) : `--disable-web-security`

\**For firefox, you must restore this settings when done playing with *MzkWorldMap*, as it makes you vulnerable to downloaded HTML documents. For chrome, just close instance and reopen it without `--disable-web-security` argument.*

### ManaZeak plugin integration

This module was mainly designed to be included in [ManaZeak](https://github.com/ManaZeak/ManaZeak) as a plugin. If you administrate a ManaZeak instance and wish to install this plugin, refer to the ManaZeak's wiki [Plugin management](https://github.com/ManaZeak/ManaZeak/wiki/[ADM]-Plugins) entry.

### Integrate this anywhere

You can also integrate this on any website. In the `./dist/` folder, you will find both minified css and javascript. Reference those files in your project, and ensure that the `./assets/` folder is routed in your web application, so *MzkWorldMap* can properly load its ressources. Then create a basic instance of the world :

```javascript
// Simple 3D scene to browse the map and click on countries
const map = new MzkWorldMap({
  baseUrl: 'path/to/MzkWorldMap/', // The path that contains the `assets/` folder
  renderTo: window // The DOM element to insert MzkWorldMap
});
```

Or a more advanced one, that will analyze given data (object per country) to represent these objects with scaled heights, and call back when a country is clicked :

```javascript
// Your custom dataset of object (here artists) per country
const myData = {
  type: 'artists', // The type of data you want
  countries: [{
    trigram: 'FRA', // Must match NATO 3 letters country codes
    artists: [{ // Must match type as key
      name: 'Habstrakt',
      id: '42'
    }/*, { ... } */]
  }/*, { ... } */]
};
// Full example with data and click callback
const map = new MzkWorldMap({
  baseUrl: 'path/to/MzkWorldMap/', // The path that contains the `assets/` folder
  renderTo: window, // The DOM element to insert MzkWorldMap
  countryClicked: info => alert(info), // The country clicked callback
  data: myData // The object per country data
});
```

### Credits

- [Three.js](https://threejs.org/) - 3D rendering, [*Mr.doob*](https://github.com/mrdoob)
- [Geojson data](https://github.com/nvkelso/natural-earth-vector) - Earth mapping, [*Nathaniel V. Kelso*](https://github.com/nvkelso)
- [Conic polygon geometry](https://github.com/vasturiano/three-conic-polygon-geometry) - Country geometry, [*Vasco Asturiano*](https://github.com/vasturiano)
- [Textures](https://github.com/ManaZeak/MzkWorldMap/tree/master/assets/img/maps) - Overall look, [*Natural Earth Data*](https://www.naturalearthdata.com/) *and* [*Natural Earth Data III*](http://www.shadedrelief.com/natural3/extra.html)
- [World data](https://github.com/ManaZeak/MzkWorldMap/blob/master/assets/json/WorldData.json) - Country informations, [*Arthur Beaulieu*](https://github.com/ArthurBeaulieu)

<p>
  <img src="/assets/img/screenshots/sunrise.jpg" width="960" height="540" />  
</p>
