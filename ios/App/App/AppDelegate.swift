import UIKit
import Capacitor
import HealthKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // @capacitor/push-notifications APNs token'ını bu iki çağrı olmadan hiç
    // alamaz: izin verilir ama "registration" olayı tetiklenmez.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}

// MARK: - Apple Sağlık
//
// Ayrı dosya yerine burada: yeni Swift dosyası project.pbxproj kaydı ister ve
// o dosya Mac'teki yerel imzalama ayarlarıyla çakışır.


/// Uygulamanın kendi native eklentilerini köprüye kaydeder
/// (npm paketi olmayan eklentiler Capacitor tarafından otomatik bulunmaz).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(UzmanHealthPlugin())
    }
}


/// Apple Sağlık'a günlük değer yazar: o gün için daha önce BU uygulamanın
/// yazdığı örnekleri siler, yenisini kaydeder. Böylece bir öğün "yenmedi"ye
/// çevrildiğinde ya da kilo düzeltildiğinde Sağlık'ta mükerrer kayıt kalmaz.
///
/// Okuma ve izin isteme @capgo/capacitor-health ile yapılır; bu eklenti yalnızca
/// o eklentide olmayan "değiştir" işlemini ekler. İzin uygulama düzeyinde
/// olduğu için ayrıca izin istemez.
@objc(UzmanHealthPlugin)
public class UzmanHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UzmanHealthPlugin"
    public let jsName = "UzmanHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "replaceDailyValue", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    @objc func replaceDailyValue(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Sağlık bu cihazda kullanılamıyor.")
            return
        }
        guard let kind = call.getString("kind"),
              let dateKey = call.getString("date"),
              let value = call.getDouble("value"),
              value >= 0 else {
            call.reject("Eksik parametre.")
            return
        }

        let typeId: HKQuantityTypeIdentifier
        let unit: HKUnit
        switch kind {
        case "dietaryEnergy":
            typeId = .dietaryEnergyConsumed
            unit = .kilocalorie()
        case "bodyMass":
            typeId = .bodyMass
            unit = .gramUnit(with: .kilo)
        default:
            call.reject("Bilinmeyen tür: \(kind)")
            return
        }
        guard let type = HKQuantityType.quantityType(forIdentifier: typeId) else {
            call.reject("Tür kullanılamıyor.")
            return
        }

        // Gün sınırları İstanbul saatine göre (uygulamadaki günlerle aynı).
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Istanbul") ?? .current
        let parser = DateFormatter()
        parser.calendar = calendar
        parser.timeZone = calendar.timeZone
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let dayStart = parser.date(from: dateKey),
              let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart) else {
            call.reject("Geçersiz tarih.")
            return
        }

        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForSamples(withStart: dayStart, end: dayEnd, options: []),
            HKQuery.predicateForObjects(from: HKSource.default()),
        ])

        store.deleteObjects(of: type, predicate: predicate) { [weak self] _, _, deleteError in
            // Silinecek örnek yoksa da hata gelebilir; yazmaya devam ediyoruz.
            if let deleteError = deleteError as? HKError, deleteError.code == .errorAuthorizationDenied {
                call.reject("Apple Sağlık yazma izni verilmemiş.")
                return
            }
            guard value > 0 else {
                call.resolve()
                return
            }
            // Kilo sabah tartısı gibi 08:00'e, kalori günün ortasına yazılır.
            let hour = kind == "bodyMass" ? 8 : 12
            let at = calendar.date(byAdding: .hour, value: hour, to: dayStart) ?? dayStart
            let sample = HKQuantitySample(
                type: type,
                quantity: HKQuantity(unit: unit, doubleValue: value),
                start: at,
                end: at
            )
            self?.store.save(sample) { _, saveError in
                if let saveError = saveError {
                    call.reject("Apple Sağlık'a yazılamadı: \(saveError.localizedDescription)")
                } else {
                    call.resolve()
                }
            }
        }
    }
}
