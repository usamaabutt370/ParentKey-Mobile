import Foundation
import UIKit
import React

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

  @objc
  func getDeviceModelLabel(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(Self.marketingDeviceName())
  }

  private static func hardwareIdentifier() -> String {
    var systemInfo = utsname()
    uname(&systemInfo)
    return withUnsafePointer(to: &systemInfo.machine) { pointer in
      pointer.withMemoryRebound(to: CChar.self, capacity: 1) { machinePointer in
        String(cString: machinePointer)
      }
    }
  }

  private static func marketingDeviceName() -> String {
    let identifier = hardwareIdentifier()
    if let mapped = modelMap[identifier] {
      return mapped
    }

    // Simulator identifiers look like "x86_64" / "arm64".
    if identifier == "x86_64" || identifier == "arm64" || identifier.hasPrefix("i386") {
      #if targetEnvironment(simulator)
        if UIDevice.current.userInterfaceIdiom == .pad {
          return "iPad"
        }
        return "iPhone"
      #endif
    }

    if identifier.hasPrefix("iPad") {
      return "iPad"
    }
    if identifier.hasPrefix("iPhone") {
      return "iPhone"
    }
    if identifier.hasPrefix("iPod") {
      return "iPod touch"
    }

    return UIDevice.current.model
  }

  /// Hardware identifier → marketing name (common recent devices).
  private static let modelMap: [String: String] = [
    // iPhone 12
    "iPhone13,1": "iPhone 12 mini",
    "iPhone13,2": "iPhone 12",
    "iPhone13,3": "iPhone 12 Pro",
    "iPhone13,4": "iPhone 12 Pro Max",
    // iPhone 13
    "iPhone14,4": "iPhone 13 mini",
    "iPhone14,5": "iPhone 13",
    "iPhone14,2": "iPhone 13 Pro",
    "iPhone14,3": "iPhone 13 Pro Max",
    // iPhone SE (3rd)
    "iPhone14,6": "iPhone SE (3rd generation)",
    // iPhone 14
    "iPhone14,7": "iPhone 14",
    "iPhone14,8": "iPhone 14 Plus",
    "iPhone15,2": "iPhone 14 Pro",
    "iPhone15,3": "iPhone 14 Pro Max",
    // iPhone 15
    "iPhone15,4": "iPhone 15",
    "iPhone15,5": "iPhone 15 Plus",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    // iPhone 16
    "iPhone17,3": "iPhone 16",
    "iPhone17,4": "iPhone 16 Plus",
    "iPhone17,1": "iPhone 16 Pro",
    "iPhone17,2": "iPhone 16 Pro Max",
    "iPhone17,5": "iPhone 16e",
    // Recent iPads (subset)
    "iPad13,18": "iPad (10th generation)",
    "iPad13,19": "iPad (10th generation)",
    "iPad14,8": "iPad Air (M2)",
    "iPad14,9": "iPad Air (M2)",
    "iPad14,10": "iPad Air (M2)",
    "iPad14,11": "iPad Air (M2)",
    "iPad16,3": "iPad Pro (M4)",
    "iPad16,4": "iPad Pro (M4)",
    "iPad16,5": "iPad Pro (M4)",
    "iPad16,6": "iPad Pro (M4)",
  ]
}
