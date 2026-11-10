// Build needs the DATUMM Revit plugin connected: show setup guidance only then.
export const needsPluginSetup=(mode,devices)=>mode==='build'&&!(devices??[]).some(device=>device.online);
