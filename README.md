# ReSlides Web App

**ReSlides** es una aplicación web sencilla que convierte un guion de diapositivas en una presentación HTML completamente estilizada, utilizando la plantilla profesional analizada en este proyecto. Permite generar páginas de gráficas interactivas y empaquetar todo en un archivo ZIP listo para descargar.

## Estructura del proyecto

- `index.html` — Página principal con la interfaz de chat donde escribes tu guion y recibes la presentación.
- `script.js` — Lógica de cliente que analiza el guion, genera la presentación y gráficas, empaqueta los archivos en un ZIP y actualiza la interfaz.
- `README.md` — Este archivo.

## Cómo usar

1. Abre `index.html` en tu navegador.
2. Escribe tu guion en el área de texto siguiendo el formato de ejemplo. Cada diapositiva empieza con `Diapositiva N`. Utiliza `Título:`, `Contenido:` y `Datos:` para definir el título, texto y datos de gráficas respectivamente. Separa los puntos de `Contenido` con punto y coma `;`. Para los datos de gráficas usa `Labels:` y `Valores:` separados por punto y coma.
3. Pulsa **Enviar**. La aplicación procesará el guion y generará una carpeta virtual con los siguientes archivos:
   - `presentacion.html` — La presentación principal con tus diapositivas y miniaturas de gráficas personalizables.
   - `grafica*.html` — Una página HTML por cada gráfica incluida en tu guion.
   - `readme.md` — Instrucciones de uso básicas generadas automáticamente.
4. Descarga el archivo ZIP y ábrelo. Extrae el contenido y abre `presentacion.html` para ver tu presentación. Puedes mover, eliminar o duplicar las vistas previas de las gráficas dentro de la propia presentación.

## Funcionalidades de vistas previas

En las diapositivas que contienen una gráfica, la columna derecha muestra una o más miniaturas de la página de la gráfica. Puedes:

- **Añadir más vistas previas** con el botón “Añadir vista previa”.
- **Eliminar** una vista previa haciendo clic en la `×` roja de la esquina.
- **Arrastrar y soltar** las miniaturas para reordenarlas.

## Despliegue en Vercel

Este proyecto es estático y está listo para desplegarse en [Vercel](https://vercel.com/). Para desplegarlo:

1. Sube la carpeta `reslides_app` a un repositorio en GitHub u otra plataforma de control de versiones.
2. Ve a Vercel y crea un nuevo proyecto enlazando tu repositorio.
3. Vercel detectará automáticamente que se trata de un sitio estático y lo desplegará.
4. Una vez desplegado, podrás acceder a tu instancia de **ReSlides** desde cualquier navegador.

---

Esta app se creó como ejemplo práctico para ilustrar cómo generalizar y reutilizar la plantilla de la presentación original de IA en Psicología, adaptándola a un generador flexible y autosuficiente.