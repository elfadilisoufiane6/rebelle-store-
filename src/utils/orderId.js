function generateOrderId() {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 90_000) + 10_000;
  return `RB-${year}-${seq}`;
}

module.exports = { generateOrderId };
