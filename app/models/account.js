var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var accountSchema = new Schema({
    host: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: false
    }
},
{
  timestamps: true
});

var Account = mongoose.model('Account', accountSchema);

module.exports = Account;
