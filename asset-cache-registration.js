// Optional speed-up: a blocked cache never prevents the app from opening.
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./asset-worker.js',{updateViaCache:'none'}).catch(()=>{});
}
