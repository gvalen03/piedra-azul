import { S3StorageService } from "../../shared/infrastructure/s3-storage.service.js";
import { randomUUID } from "node:crypto";

export class ArchivoService {
    constructor() {
        this.storage = new S3StorageService();
    }

    async subirArchivo({ nombre, contenido, tipo }) {
        if (!nombre || !contenido) {
            throw new Error("El archivo es obligatorio");
        }

        const tiposPermitidos = [
            "application/pdf",
            "image/jpeg",
            "image/png",
        ];

        if (!tiposPermitidos.includes(tipo)) {
            throw new Error("Tipo de archivo no permitido");
        }

        const nombreSeguro = nombre
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        const key = `archivos/${randomUUID()}-${nombreSeguro}`;

        await this.storage.subirArchivo({
            key,
            contenido,
            contentType: tipo,
        });

        return {
            key,
            nombre,
            tipo,
        };
    }

    async obtenerArchivo(key) {
        if (!key) {
            throw new Error("La clave del archivo es obligatoria");
        }

        return this.storage.obtenerArchivo(key);
    }

    async eliminarArchivo(key) {
        if (!key) {
            throw new Error("La clave del archivo es obligatoria");
        }

        await this.storage.eliminarArchivo(key);
    }
}