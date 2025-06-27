import City from '../models/City.js';


// Determine zone based on origin (Nowshera) and destination
export const resolveZone = async (req, res) => {
  try {
    const { originCity, destinationCity } = req.params;

    if (!originCity || !destinationCity) {
      return res.status(400).json({ message: 'Origin and destination cities are required' });
    }

    const cities = await City.find({});

    const origin = cities.find(c =>
      originCity.toLowerCase().includes(c.cityName.toLowerCase())
    );

    const destination = cities.find(c =>
      destinationCity.toLowerCase().includes(c.cityName.toLowerCase())
    );

    if (!origin || !destination) {
      return res.status(404).json({
        zone: 'differentZone',
        message: 'Origin or destination city not found in database',
      });
    }

    let zone = 'differentZone';
    if (destination.cityName.toLowerCase() === origin.cityName.toLowerCase()) {
      zone = 'withinCity';
    } else if (destination.region === origin.region) {
      zone = 'sameZone';
    }

    res.status(200).json({
      zone,
      origin: origin.cityName,
      destination: destination.cityName,
      originRegion: origin.region,
      destinationRegion: destination.region,
    });
  } catch (err) {
    console.error('Error resolving zone:', err);
    res.status(500).json({ message: 'Failed to resolve zone', error: err.message });
  }
};


export const getAllCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ cityName: 1 }); // Sort A-Z
    res.status(200).json(cities);
  } catch (err) {
    console.error('Error fetching cities:', err);
    res.status(500).json({ message: 'Failed to fetch cities', error: err.message });
  }
};