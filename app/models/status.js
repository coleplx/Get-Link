var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var statusSchema = new Schema({
  host: String,
  status: {
    type: String,
    enum: ['Stoped', 'Running']
  },
  count: {
    type: Number,
    default: 0
  }
},
{
  timestamps: true
});

var Status = mongoose.model('Status', statusSchema);

module.exports = Status;
