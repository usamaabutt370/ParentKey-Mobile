import Foundation

@objc(AppInfo)
class AppInfo: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    let bundleId = Bundle.main.bundleIdentifier ?? ""
    let flavor =
      bundleId == "com.parentkey.child" || bundleId.hasSuffix(".child")
      ? "child"
      : "parent"
    return ["flavor": flavor]
  }
}
