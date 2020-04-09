# MzkWorldMap

![](https://badgen.net/badge/version/0.8/blue)

This project's main goal is to simulate a 3D Earth, on which one can browse the planet to discover music from all over the world.
This ThreeJS bedrock is the core of the MzkWorldMap plugin, since this projet require a track database to perform well.

However, one can still use it standalone with sample data to try it out. Check out the wiki page to know more about data formatting for MzkWorldMap.
Coming Milestones can be found on the [Trello board](https://trello.com/b/ONoFwDyj/MzkWorldMap).

## Features

- [x] Geocentric (yet inaccurate) mode ;
- [x] Earth with bump/specular map and political boundaries ;
- [x] Sun and Moon ;
- [x] Space navigation ;
- [x] Loading country data from json ;
- [x] Callback on country clicked ;
- [ ] Mzk plugin formatting (single module).

## Techno

- ES6 Vanilla Js ;
- ThreeJS.
- World geojson (https://github.com/datasets/geo-countries)
- Three js Geojson Geometry (https://github.com/vasturiano/three-geojson-geometry)
