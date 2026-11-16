import { ArchivoService } from "./archivo.service.js";

export default async function archivoRoutes(fastify) {
    const archivoService = new ArchivoService();

    // =========================
    // SUBIR ARCHIVO
    // =========================

    fastify.post("/archivos", async (request, reply) => {
        try {
            const archivo = await request.file();

            if (!archivo) {
                return reply.code(400).send({
                    error: "Debe enviar un archivo",
                });
            }

            const contenido = await archivo.toBuffer();

            const resultado = await archivoService.subirArchivo({
                nombre: archivo.filename,
                contenido,
                tipo: archivo.mimetype,
            });

            return reply.code(201).send({
                mensaje: "Archivo subido correctamente",
                archivo: resultado,
            });
        } catch (error) {
            request.log.error(error);

            if (error.code === "FST_REQ_FILE_TOO_LARGE") {
                return reply.code(413).send({
                    error: "El archivo supera el tamaño máximo permitido de 5 MB",
                });
            }

            if (error.message === "Tipo de archivo no permitido") {
                return reply.code(400).send({
                    error: error.message,
                });
            }

            return reply.code(500).send({
                error: "No fue posible subir el archivo",
            });
        }
    });

    // =========================
    // OBTENER ARCHIVO
    // =========================

    fastify.get("/archivos/*", async (request, reply) => {
        try {
            const key = request.params["*"];

            const resultado =
                await archivoService.obtenerArchivo(key);

            const contenido =
                await resultado.Body.transformToByteArray();

            reply.header(
                "Content-Type",
                resultado.ContentType || "application/octet-stream"
            );

            return reply.send(Buffer.from(contenido));
        } catch (error) {
            request.log.error(error);

            return reply.code(404).send({
                error: "Archivo no encontrado",
            });
        }
    });

    // =========================
    // ELIMINAR ARCHIVO
    // =========================

    fastify.delete("/archivos/*", async (request, reply) => {
        try {
            const key = request.params["*"];

            await archivoService.eliminarArchivo(key);

            return reply.send({
                mensaje: "Archivo eliminado correctamente",
                key,
            });
        } catch (error) {
            request.log.error(error);

            return reply.code(500).send({
                error: "No fue posible eliminar el archivo",
            });
        }
    });
}