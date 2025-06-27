import mongoose from 'mongoose';

const CitySchema = new mongoose.Schema({
  cityId: Number,
  cityName: String,
  cityCode: String,
  area: String,
  region: String,
});

const City = mongoose.model('City', CitySchema);
export default City;
