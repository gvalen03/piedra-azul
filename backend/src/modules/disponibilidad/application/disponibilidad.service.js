import { Disponibilidad } from "../domain/disponibilidad.entity.js";
import { FranjaHoraria } from "../domain/franja-horaria.js";

export class DisponibilidadService {
  constructor({ disponibilidadRepository, citaRepository }) {
    this.disponibilidadRepository = disponibilidadRepository;
    this.citaRepository = citaRepository;
  }

  async configurar(dto) {
    if (dto.horaInicio >= dto.horaFin) throw new Error("La hora de inicio debe ser menor que la hora de fin");
    if (dto.intervaloMinutos <= 0) throw new Error("El intervalo debe ser mayor que cero");
    if (dto.semanasHabilitadas <= 0) throw new Error("Las semanas habilitadas deben ser mayor que cero");

    const disponibilidad = new Disponibilidad(dto);
    return await this.disponibilidadRepository.guardar(disponibilidad);
  }

  async obtenerFranjasDisponibles({ medicoId, fecha }) {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const configuracion = await this.disponibilidadRepository.buscarPorMedicoYDia(medicoId, diaSemana);
    if (!configuracion) return [];

    const franjas = this.generarFranjas(configuracion);
    const citas = (await this.citaRepository.listarPorMedicoYFecha(medicoId, fecha)) ?? [];

    return franjas.filter(f => !citas.some(c => c.hora_inicio?.slice(0, 5) === f.horaInicio));
  }

  generarFranjas(configuracion) {
    const franjas = [];
    const [hIniH, hIniM] = configuracion.hora_inicio.split(":").map(Number);
    const [hFinH, hFinM] = configuracion.hora_fin.split(":").map(Number);
    let actual = hIniH * 60 + hIniM;
    const fin = hFinH * 60 + hFinM;
    const intervalo = configuracion.intervalo_minutos;

    while (actual + intervalo <= fin) {
      franjas.push(new FranjaHoraria({
        horaInicio: this.minutosAHora(actual),
        horaFin: this.minutosAHora(actual + intervalo)
      }));
      actual += intervalo;
    }
    return franjas;
  }

  minutosAHora(m) {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  obtenerDiaSemana(fecha) {
    const dias = ["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"];
    return dias[new Date(`${fecha}T00:00:00`).getDay()];
  }
}