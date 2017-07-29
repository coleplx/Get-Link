var mongoose = require('mongoose');
var Schema = mongoose.Schema,
    bcrypt = require('bcryptjs');

var userSchema = new Schema({
  name: String,
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  is_admin: Boolean
},
{
  timestamps: true
});

userSchema.statics.genHashPassword = function(password) {
    var hash = bcrypt.hashSync(password, 10);
    return hash;
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(pasword, this.password);
};

var User = mongoose.model('User', userSchema);

module.exports = User;
