import { Disponibilidad } from "../domain/disponibilidad.entity.js";
import { FranjaHoraria } from "../domain/franja-horaria.js";

export class DisponibilidadService {
  constructor({
    disponibilidadRepository,
    citaRepository
  }) {
    this.disponibilidadRepository = disponibilidadRepository;
    this.citaRepository = citaRepository;
  }

  async configurar(dto) {
    if (dto.horaInicio >= dto.horaFin) {
      throw new Error("La hora de inicio debe ser menor que la hora de fin");
    }

    if (dto.intervaloMinutos <= 0) {
      throw new Error("El intervalo debe ser mayor que cero");
    }

    const disponibilidad = new Disponibilidad(dto);

    return await this.disponibilidadRepository.guardar(disponibilidad);
  }

  async obtenerFranjasDisponibles({
    medicoId,
    fecha
  }) {
    const diaSemana = this.obtenerDiaSemana(fecha);

    const configuracion =
      await this.disponibilidadRepository.buscarPorMedicoYDia(
        medicoId,
        diaSemana
      );

    if (!configuracion) {
      return [];
    }

    const franjas = this.generarFranjas(configuracion);

    const citas =
      await this.citaRepository.listarPorMedicoYFecha(
        medicoId,
        fecha
      );

    return franjas.filter(franja =>
      !citas.some(cita =>
        cita.horaInicio === franja.horaInicio
      )
    );
  }

  generarFranjas(configuracion) {
    // genera intervalos entre horaInicio y horaFin
  }

  obtenerDiaSemana(fecha) {
    // convierte la fecha al día correspondiente
  }
}