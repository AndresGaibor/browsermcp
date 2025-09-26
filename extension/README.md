# Browser MCP Extension

Esta extensión permite a las aplicaciones de IA automatizar tu navegador usando el protocolo MCP (Model Context Protocol).

## Instalación para Desarrollo

1. **Abrir Chrome y ir a Extensiones:**
   - Abre Chrome
   - Ve a `chrome://extensions/`
   - Activa "Modo de desarrollador" (Developer mode) en la esquina superior derecha

2. **Cargar la extensión:**
   - Haz clic en "Cargar extensión sin empaquetar" (Load unpacked)
   - Selecciona la carpeta `extension/` de este proyecto
   - La extensión debería aparecer en la lista

3. **Configurar la extensión:**
   - Haz clic en el icono de la extensión en la barra de herramientas
   - Ve a "Settings" para configurar el puerto del servidor MCP (por defecto: 9234)
   - Opcionalmente configura un token de autenticación

## Uso

### 1. Iniciar el servidor MCP
Desde la raíz del proyecto:
```bash
bun run build && bun run dist/index.js
```

### 2. Conectar la extensión
- Abre una pestaña en la página que quieres automatizar
- Haz clic en el icono de Browser MCP en la barra de herramientas
- Haz clic en "Connect"
- El estado debería cambiar a "Connected" con un punto verde

### 3. Usar con aplicaciones de IA
Ahora puedes usar aplicaciones como Claude, Cursor, o VS Code con MCP para automatizar la pestaña conectada.

## Estructura de la Extensión

```
extension/
├── manifest.json          # Configuración de la extensión
├── popup/                 # UI del popup (botón Connect/Disconnect)
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/            # Service worker (conexión WebSocket)
│   └── background.js
├── content/               # Script que ejecuta acciones en la página
│   └── content.js
├── options/               # Página de configuración
│   ├── options.html
│   ├── options.css
│   └── options.js
└── icons/                 # Iconos de la extensión
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Funcionalidades Implementadas

### Acciones de DOM
- `click` - Hacer clic en elementos
- `type` - Escribir texto en campos
- `hover` - Pasar el ratón sobre elementos
- `scroll` - Hacer scroll en la página
- `navigate` - Navegar a URLs o usar historial
- `snapshot` - Capturar estado ARIA de la página
- `selectOption` - Seleccionar opciones en dropdowns
- `getAttribute` - Obtener atributos de elementos
- `getText` - Obtener texto de elementos
- `waitForElement` - Esperar a que aparezca un elemento

### Configuración
- Puerto del servidor MCP (por defecto: 9234)
- Token de autenticación opcional
- Número de intentos de reconexión
- Modo debug para logging

## Desarrollo

### Debugging
1. Abre Chrome DevTools en la página donde está la extensión
2. Ve a la pestaña "Console" para ver logs del content script
3. Para debugging del background script:
   - Ve a `chrome://extensions/`
   - Haz clic en "Service worker" en la extensión
   - Se abrirá DevTools para el background script

### Recarga de la extensión
Después de hacer cambios al código:
1. Ve a `chrome://extensions/`
2. Haz clic en el botón de "Recargar" (⟳) en la extensión
3. Recarga cualquier pestaña que esté usando la extensión

## Troubleshooting

### La extensión no se conecta
- Verifica que el servidor MCP esté corriendo en el puerto configurado
- Revisa la configuración en la página de opciones
- Mira los logs en la consola del background script

### Las acciones no funcionan
- Asegúrate de que la pestaña esté "conectada" (punto verde en el popup)
- Verifica que los selectores de elementos sean correctos
- Revisa la consola del content script para errores

### La extensión desaparece
- Recarga la extensión en `chrome://extensions/`
- Verifica que no haya errores de sintaxis en el código