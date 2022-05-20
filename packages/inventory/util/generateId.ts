export function generateId(): string {
  let chars =
    "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let length = 12;
  let id = "";

  for (var i = 0; i <= length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    id += chars.substring(randomNumber, randomNumber + 1);
  }

  return id;
}
