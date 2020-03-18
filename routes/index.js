/*
 * GET home page.
 */
exports.index = function(req, res) {
  res.render('mfl', { title: 'MotsFleches.js', wsAddress: process.env.SOCKET_ADDR });
};
