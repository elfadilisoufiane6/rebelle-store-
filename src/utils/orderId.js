// Order ID format: rebelle-YYMMDD-XXXX (e.g. rebelle-260528-4827).
// Sortable by date and unique enough for COD volume.
function generateOrderId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `rebelle-${yy}${mm}${dd}-${seq}`;
}

module.exports = { generateOrderId };
