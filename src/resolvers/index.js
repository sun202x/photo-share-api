const Query = require('./query');
const Mutation = require('./mutation');
const Subscription = require('./subscription');
const Type = require('./type');

const resolvers = {
  Query,
  Mutation,
  Subscription,
  ...Type
};

module.exports = resolvers;