/*
 * CONFIGURACIÓN DEL SITIO
 * -----------------------------------------------------------
 * 1) Pegue en API_URL la URL de su Apps Script (termina en /exec).
 *    Mientras esté vacía, el sitio funciona en "modo demostración"
 *    (los datos solo se guardan en su navegador).
 * 2) Ajuste nombres, fecha y textos si hace falta.
 */
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwBsIePbPrjr677B-L-Mk16SAIhVcPV8x4o6BygZ09wcQ9n0KHxpqVEvTxXVl3Z2xWhDw/exec",

  TITULO: "Amigo Secreto",
  SUBTITULO: "Navidad 2026",

  // Fecha y hora del intercambio (hora de Costa Rica, -06:00)
  FECHA_INTERCAMBIO: "2026-12-16T00:00:00-06:00",

  PERSONAS: [
    "Dra. Dai",
    "Dra. Megan",
    "Dr. Luis Rubio",
    "Juan Pablo",
    "María José",
    "Mariela",
    "Dennise",
    "Sherry",
    "Shirleny",
    "Daniela",
    "Miguel"
  ],

  // Cada cuántos segundos se buscan regalos nuevos
  REFRESCO_SEGUNDOS: 30
};
