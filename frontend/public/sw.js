self.addEventListener("push", (event) => {
  const text = event.data ? event.data.text() : "New content needs your approval";
  event.waitUntil(
    self.registration.showNotification("AI Platform", {
      body: text,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "content-approval",
      renotify: true,
      data: { url: "/content" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/content";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(target) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })
  );
});
