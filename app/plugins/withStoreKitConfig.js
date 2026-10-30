// Liga o arquivo de produtos de teste (storekit/LeagueAlert.storekit) ao scheme do Xcode.
// Assim, rodando pelo Xcode (Cmd+R), as compras de apoio funcionam no Simulador
// sem conta Apple paga e sem cobrar nada. Na App Store esse arquivo não é usado.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILE = 'LeagueAlert.storekit';

module.exports = function withStoreKitConfig(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const name = cfg.modRequest.projectName;
      fs.copyFileSync(path.join(cfg.modRequest.projectRoot, 'storekit', FILE), path.join(iosRoot, name, FILE));

      const scheme = path.join(iosRoot, `${name}.xcodeproj`, 'xcshareddata', 'xcschemes', `${name}.xcscheme`);
      let xml = fs.readFileSync(scheme, 'utf8');
      if (!xml.includes('StoreKitConfigurationFileReference')) {
        // O caminho é relativo ao LeagueAlert.xcodeproj (testado: "../" é a pasta ios/).
        const ref = `      <StoreKitConfigurationFileReference\n         identifier = "../${name}/${FILE}">\n      </StoreKitConfigurationFileReference>\n`;
        xml = xml.replace('   </LaunchAction>', `${ref}   </LaunchAction>`);
        fs.writeFileSync(scheme, xml);
      }
      return cfg;
    },
  ]);
};
