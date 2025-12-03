
import { BackupData, GoogleDriveConfig } from '../types';
import { GOOGLE_CLIENT_ID } from '../config';

// Types for Global Google Objects
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
// Changed to full drive scope to allow writing to user-created folders
const SCOPES = 'https://www.googleapis.com/auth/drive';

export const initGoogleDrive = async (clientId: string): Promise<boolean> => {
  // Verificação de protocolo (Log apenas, não bloqueia mais para evitar falsos positivos em ambientes dev)
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    console.warn("ATENÇÃO: A API do Google pode não funcionar no protocolo atual (" + window.location.protocol + "). É necessário rodar em um servidor local (http://localhost).");
  }

  if (!window.gapi || !window.google) {
    console.error("Scripts do Google (gapi/google) não foram carregados. Verifique sua conexão ou adblockers.");
    return false;
  }

  return new Promise((resolve) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: '', // API Key não é estritamente necessária para fluxo implícito
          discoveryDocs: [DISCOVERY_DOC],
        });
        resolve(true);
      } catch (err) {
        console.error("Erro ao inicializar cliente GAPI:", err);
        resolve(false);
      }
    });
  });
};

export const performBackupToDrive = async (
  config: GoogleDriveConfig,
  data: BackupData,
  isAuto: boolean = false
): Promise<{ success: boolean; message: string }> => {

  // Use global ID if not provided in config (backward compatibility or simplification)
  const effectiveClientId = config.clientId || GOOGLE_CLIENT_ID;

  if (!config.enabled || !effectiveClientId || !config.folderId) {
    return { success: false, message: "Configuração incompleta." };
  }

  try {
    // 1. Initialize Client if needed
    const initialized = await initGoogleDrive(effectiveClientId);
    if (!initialized) {
      return { success: false, message: "Falha ao inicializar scripts do Google. Certifique-se de rodar via servidor local (http)." };
    }

    return new Promise((resolve) => {
      // Wrapper to handle the async upload after getting token
      const uploadLogic = async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
            const fileName = `financas-auto-backup-${new Date().toISOString().split('T')[0]}.json`;
            const fileContent = JSON.stringify(data, null, 2);

            const file = new Blob([fileContent], { type: 'application/json' });
            const metadata = {
              name: fileName,
              mimeType: 'application/json',
              parents: [config.folderId]
            };

            const accessToken = tokenResponse.access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
              body: form,
            });

            if (response.ok) {
              resolve({ success: true, message: "Backup salvo no Drive com sucesso!" });
            } else {
              const err = await response.json();
              console.error("Drive API Upload Error:", err);
              resolve({ success: false, message: "Erro ao enviar arquivo. Verifique se o ID da Pasta está correto e compartilhado." });
            }

          } catch (uErr) {
            console.error(uErr);
            resolve({ success: false, message: "Erro de rede durante o upload." });
          }
        } else {
          resolve({ success: false, message: "Permissão negada ou token inválido." });
        }
      };

      try {
        // 2. Request Token with ERROR HANDLING
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: effectiveClientId,
          scope: SCOPES,
          callback: uploadLogic,
          error_callback: (error: any) => {
            // Captura erros de origem como 'redirect_uri_mismatch' ou 'storagerelay'
            console.error("Google Auth Error Callback:", error);

            let msg = "Erro de Autorização.";
            if (error.type === 'popup_closed') msg = "Janela de login fechada ou bloqueada pelo navegador. Se for backup automático, isso é esperado se o popup for bloqueado.";
            if (error.type === 'redirect_uri_mismatch' || error.message?.includes('origin')) {
              msg = "Erro de Origem: Adicione a URL atual no 'Authorized JavaScript origins' do Google Cloud.";
            }

            resolve({
              success: false,
              message: msg
            });
          }
        });

        // Se for automático, tenta silencioso. Se for manual, força o prompt para permitir login.
        if (isAuto) {
          tokenClient.requestAccessToken({ prompt: '' });
        } else {
          tokenClient.requestAccessToken({ prompt: 'consent' });
        }

      } catch (initErr) {
        console.error("Erro ao iniciar TokenClient:", initErr);
        resolve({ success: false, message: "Erro na configuração do Google Auth." });
      }
    });

  } catch (error: any) {
    console.error("Drive Service Exception:", error);
    return { success: false, message: error.message || "Erro desconhecido." };
  }
};
