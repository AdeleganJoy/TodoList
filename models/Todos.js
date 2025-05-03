const mongoose = require('mongoose');

const todosSchema = new mongoose.Schema({
  user: { type: String, required: true, unique: true },
  items: { type: [String], required: true },
});

const Todos = mongoose.model('Todos', todosSchema);

module.exports = Todos;
