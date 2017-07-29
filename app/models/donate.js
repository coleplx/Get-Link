var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var donateSchema = new Schema({
  people: String,
  comment: String,
  type: {
    type: String, 
    enum: ['Card', 'Account', 'Paypal'],
    required: true
  },
  card: {
    net: String,
    serial: String,
    number: String
  },
  account: {
    host: String,
    account: String,
    password: String
  },
  paypal: {
    email: String,
    amount: Number
  }
},
{
  timestamps: true
});

var Donate = mongoose.model('Donate', donateSchema);

module.exports = Donate;