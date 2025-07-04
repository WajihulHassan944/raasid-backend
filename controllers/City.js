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

export const getAllCityNames = async (req, res) => {
  try {
    const cities = await City.find({}, 'cityName'); // only fetch cityName field
    const cityNames = cities.map(city => city.cityName);

    res.status(200).json({
      success: true,
      cities: cityNames,
    });
  } catch (err) {
    console.error('Error fetching city names:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch city names',
      error: err.message,
    });
  }
};



// Determine zone and calculate shipping fee (params-based version)
export const resolveZoneWithRate = async (req, res) => {
  try {
    const { originCity, destinationCity, weight } = req.params;

    if (!originCity || !destinationCity || weight === undefined) {
      return res.status(400).json({ message: 'Origin, destination, and weight are required' });
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

    // Convert grams to kilograms for tariff logic
    const parsedWeightInKg = parseFloat(weight) / 1000;

    if (isNaN(parsedWeightInKg) || parsedWeightInKg <= 0) {
      return res.status(400).json({ message: 'Invalid weight provided' });
    }

    const TCS_TARIFF = {
      withinCity: { upto0_5: 127, upto1: 170, additional: 170 },
      sameZone: { upto0_5: 170, upto1: 212, additional: 170 },
      differentZone: { upto0_5: 212, upto1: 255, additional: 170 },
    };

    let shippingFee = 0;
    if (parsedWeightInKg <= 0.5) {
      shippingFee = TCS_TARIFF[zone].upto0_5;
    } else if (parsedWeightInKg <= 1) {
      shippingFee = TCS_TARIFF[zone].upto1;
    } else {
      const extraWeight = Math.ceil(parsedWeightInKg - 1);
      shippingFee = TCS_TARIFF[zone].upto1 + (extraWeight * TCS_TARIFF[zone].additional);
    }

    res.status(200).json({
      zone,
      origin: origin.cityName,
      destination: destination.cityName,
      originRegion: origin.region,
      destinationRegion: destination.region,
      weight: `${weight}g`, // returning original grams
      shippingFee,
    });
  } catch (err) {
    console.error('Error resolving zone with rate:', err);
    res.status(500).json({ message: 'Failed to resolve zone and rate', error: err.message });
  }
};

// Auto-origin zone and shipping fee calculator
export const autoResolveZoneWithRate = async (req, res) => {
  try {
    const { destinationCity, weight } = req.params;

    if (!destinationCity || weight === undefined) {
      return res.status(400).json({ message: 'Destination and weight are required' });
    }

    const cities = await City.find({});

    const destination = cities.find(c =>
      destinationCity.toLowerCase().includes(c.cityName.toLowerCase())
    );

    if (!destination) {
      return res.status(404).json({
        zone: 'differentZone',
        message: 'Destination city not found in database',
      });
    }

    // Possible origin cities
    const originOptions = ['Nowshera', 'Rawalpindi'];
    const originCities = cities.filter(c =>
      originOptions.some(originName =>
        originName.toLowerCase().includes(c.cityName.toLowerCase())
      )
    );

    // Pick closest origin (same region first)
    let selectedOrigin = originCities.find(o => o.region === destination.region);
    if (!selectedOrigin) selectedOrigin = originCities[0]; // default to Nowshera

    let zone = 'differentZone';
    if (destination.cityName.toLowerCase() === selectedOrigin.cityName.toLowerCase()) {
      zone = 'withinCity';
    } else if (destination.region === selectedOrigin.region) {
      zone = 'sameZone';
    }

    // Convert grams to kilograms
    const parsedWeightInKg = parseFloat(weight) / 1000;
    if (isNaN(parsedWeightInKg) || parsedWeightInKg <= 0) {
      return res.status(400).json({ message: 'Invalid weight provided' });
    }

    const TCS_TARIFF = {
      withinCity: { upto0_5: 127, upto1: 170, additional: 170 },
      sameZone: { upto0_5: 170, upto1: 212, additional: 170 },
      differentZone: { upto0_5: 212, upto1: 255, additional: 170 },
    };

    let shippingFee = 0;
    if (parsedWeightInKg <= 0.5) {
      shippingFee = TCS_TARIFF[zone].upto0_5;
    } else if (parsedWeightInKg <= 1) {
      shippingFee = TCS_TARIFF[zone].upto1;
    } else {
      const extraWeight = Math.ceil(parsedWeightInKg - 1);
      shippingFee = TCS_TARIFF[zone].upto1 + (extraWeight * TCS_TARIFF[zone].additional);
    }

    res.status(200).json({
      zone,
      origin: selectedOrigin.cityName,
      destination: destination.cityName,
      originRegion: selectedOrigin.region,
      destinationRegion: destination.region,
      weight: `${weight}g`,
      shippingFee,
    });
  } catch (err) {
    console.error('Error resolving shipping fee:', err);
    res.status(500).json({ message: 'Failed to resolve shipping fee', error: err.message });
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