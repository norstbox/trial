const bc = new BroadcastChannel('sw-stream-cancellation')
console.log('[SW] started')
console.log = (...msg) => {
    bc.postMessage({type: 'log', msg})
}

self.addEventListener('install', event => {
    console.log('[SW] install event fired')
});

self.addEventListener('activate', event => {
    console.log('[SW] activate event fired')
    event.waitUntil(clients.claim())
});

self.addEventListener('fetch', (event) => {
    let url = new URL(event.request.url)
    if (url.pathname === '/get-file') {
      let interval
      let counter = 0
      let cancelNotification = false
      let initialCancelReason = false
      let rs = new ReadableStream({
          start(c) {
              interval = setInterval( () => {
                  if (counter > 10) {                      
                      console.log('[SW] FAIL: Stream must be already closed, but still not')
                      clearInterval(interval)
                      c.close()
                      return
                  }
                  console.log('[SW] Stream: enqueue chunk', counter)
                  try {
                    c.enqueue( new Uint8Array([counter++]) )
                  } catch(e) {
                    if (cancelNotification) {
                        console.log('[SW] OK: Stream has been closed with prior notification about cancellation')
                        if (!initialCancelReason)
                            console.log('[SW] WARN: Stream cancellation reason is not matched to initial')
                    }
                    else
                        console.log('[SW] FAIL: Stream has been closed without prior notification about cancellation')
                    clearInterval(interval)
                  }
              }, 2000)
          },
          cancel(reason) {
              console.log('[SW] Stream cancelled with reason:', reason.toString())
              if (reason === url.pathname)
                  initialCancelReason = true                  
              cancelNotification = true
          }
      })
      let r = new Response(rs)
      event.respondWith( Promise.resolve(r) )
  }  else
      event.respondWith( fetch(event.request) )
});