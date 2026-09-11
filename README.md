Versión con los 58 registros del censo CELAM incorporados.

# CELAM v0.8.1

Calendario familiar CELAM · Club Exclusivo de Locos A Mogollón.

## Cambios de esta versión

- Eliminados los retos por ahora.
- Calendario automático por año.
- Cumpleaños y santos.
- Nueva sección Agenda familiar.
- Fichas de familiares con nombre, cumpleaños, santo, dirección, teléfono y email.
- Botones para llamar, enviar email y abrir una dirección en Google Maps.
- Nueva sección Recordatorios.
- Recordatorios locales con fecha, hora, nota y estado completado.
- Los datos se guardan solo en el dispositivo de cada usuario.
- PWA preparada para instalarse.

## Importante sobre los recordatorios

En esta primera versión los recordatorios se almacenan localmente. El botón de avisos solicita permiso al navegador, pero los avisos automáticos en segundo plano dependen del soporte del navegador/PWA. No hay servidor ni sincronización entre familiares todavía.

## Publicar

Sube el contenido de esta carpeta al repositorio de GitHub y usa GitHub Pages:
Settings → Pages → Deploy from a branch → main → /(root)


## v0.4
La información familiar es de solo lectura para los usuarios. La familia puede consultar datos y usar recordatorios personales. Los cambios en familiares se gestionan en GitHub.


## v0.5
Modo de solo consulta. Los usuarios no pueden modificar familiares, cumpleaños, santos, direcciones, teléfonos, emails, configuración ni recordatorios. La información oficial se mantiene en el repositorio por el administrador.


## v0.6
Calendario y agenda con búsqueda, recordatorios personales vinculados a cumpleaños/santos y cuarta pestaña de árbol genealógico preparada para su diseño.


## v0.7
Enlaces de Agenda configurados para usar la dirección exacta como destino de Google Maps. Modesto y Pilar aparecen como "Con Dios" y tienen una pantalla homenaje al cielo en lugar de una dirección.


## v0.8.1
Corrección de la separación entre datos oficiales y recordatorios personales. Los datos familiares se cargan directamente desde `data.js`; únicamente los recordatorios se guardan en `localStorage`.


## Firebase
Esta versión añade autenticación mediante Firebase Authentication (email y contraseña).
La configuración de Firebase está en `auth.js`. Los recordatorios siguen en `localStorage`
por ahora y no se modifican en esta fase. La siguiente fase migrará los recordatorios a Firestore
manteniendo una migración segura de los datos existentes.


## Recordatorios en Firestore
Los recordatorios se sincronizan por UID en `users/{uid}/reminders`. Se mantiene una copia local de respaldo y la primera sincronización migra los recordatorios locales que aún no existan en Firestore.
