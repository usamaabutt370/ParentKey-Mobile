#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(InstalledApps, NSObject)

RCT_EXTERN_METHOD(getInstalledApps:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
