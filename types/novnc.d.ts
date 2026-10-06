// @types/novnc__novnc still describes the old lib/ entry points; the package
// now exports the client from its root.
declare module "@novnc/novnc" {
  import RFB from "@novnc/novnc/lib/rfb"

  export default RFB
}
