var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var streamingSchema = new Schema({
  link_id: String,
  count: {
      type: Number,
      default: 0
  },

});

var Streaming = mongoose.model('Streaming', streamingSchema);

module.exports = Streaming;
