var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tokenSchema = new Schema({
  host: {type: String, required: true},
  key: {type: String, required: true},
  value: {type: String, required: true}
},
{
  timestamps: true
});

var Token = mongoose.model('Token', tokenSchema);

module.exports = Token;