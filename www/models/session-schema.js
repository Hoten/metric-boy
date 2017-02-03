var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var types = {
  endedAt: {type: Date, default: null},
  info: {type: Object, default: {}},
  tags: {type: Array, default: []}
};

var opts = {
  timestamps: true
};

var sessionSchema = new Schema(types, opts);

module.exports = sessionSchema;
