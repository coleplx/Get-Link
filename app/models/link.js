var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	randomStr = require('randomstring');

var linkSchema = new Schema({
    _id: {type: String, unique: true, index: true},
    url: {type: String, required: true},
	uid: String,
	host: {type: String, required: true},
	ip: {type: String, required: true},
	type: String,
	file: {
		name: {type: String, required: true, trim: true},
		size: {type: Number, required: true},
		type: {type: String}
	},
	image: String,
	direct_link: String,
	html: String,
	is_stream: Boolean,
	sub_link: [{
		name: String,
		size: Number,
		direct_link: String
	}]
},
{
  timestamps: true,
  autoIndex: false
});

linkSchema.index({
	'file.name': 'text'
}, function(err) {
	console.log(err);
})

linkSchema.methods.genId = function() {
	var id = randomStr.generate({
		length: 12,
		charset: 'alphanumeric'
	})

	this._id = id
}

var Link = mongoose.model('Link', linkSchema);

module.exports = Link;
