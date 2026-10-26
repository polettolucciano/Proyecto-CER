// Las notificaciones estándar de GitHub Actions siguen activas aunque no se configure webhook.
const url=process.env.CER_ALERT_WEBHOOK;
if(url){if(new URL(url).protocol!=='https:')throw new Error('El webhook debe usar HTTPS.');const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'CER: falló una verificación de backup. Revisá GitHub Actions.'})});if(!response.ok)throw new Error('No se pudo enviar el aviso.');}
else console.log('Revisar las notificaciones de ejecución fallida de GitHub Actions.');
