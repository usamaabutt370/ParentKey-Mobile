import Foundation
import React

@objc(InstalledApps)
class InstalledApps: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func getInstalledApps(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    reject(
      "IOS_NOT_SUPPORTED",
      "iOS does not allow listing installed apps. Use Apple's Screen Time app picker on the child device.",
      nil
    )
  }
}
