var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var uuid = require('node-uuid');

var types = {
  name: {type: String, required: true},
  authToken: {type: String, default: uuid.v1}
};

var opts = {
  timestamps: true
};

var gameSchema = new Schema(types, opts);

gameSchema.methods.getSessionModel = function (cb) {
  return mongoose.model("sessions-" + this._id);
  // return mongoose.model("sessions-" + this._id, require("./session-schema.js"));
}

gameSchema.pre('save', function (next) {
  this.wasNew = this.isNew;
  next();
});

gameSchema.post('save', function () {
  if (this.wasNew) {
    // create Session model
    mongoose.model("sessions-" + this._id, require("./session-schema.js"));
  }
});

module.exports = mongoose.model('Game', gameSchema);
