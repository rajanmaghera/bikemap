# bikemap

Interactive bike network map for 17 Canadian cities: Toronto, Montréal, Vancouver, Calgary, Edmonton, Ottawa–Gatineau, Winnipeg, Québec City, Hamilton, Mississauga, Kitchener–Waterloo–Cambridge, London, Halifax, Victoria, Saskatoon, Regina and St. John's. Each route is styled by how separated it is from cars: protected lanes and bike paths, multi-use trails, buffered and painted lanes, and sharrows. You can switch to a comfort-level view (high, medium, low) inspired by the Can-BICS classification, and customize the colour, thickness and dash pattern of every category.

Data loads live from [OpenStreetMap](https://www.openstreetmap.org/copyright) through the Overpass API. Basemap tiles © Esri and OpenStreetMap contributors.

## Data

`data/<city>.json` files are prebuilt so the map opens quickly. The **Update bike network data** GitHub Action rebuilds them. It has no schedule: run it from the Actions tab (Run workflow, optionally listing city keys such as `montreal calgary`), and it also runs when `classify.js` or the build script changes. To rebuild locally: `node scripts/build-data.cjs`. The page falls back to a live Overpass query if a file is missing. **Load this view** always queries live.

`classify.js` holds the rules that sort OpenStreetMap tags into route types, and both the page and the build script use it.

To add a city, add an entry (name, bounding box as south, west, north, east, and centre) to `CITIES` in `classify.js` and push. The workflow downloads it.
