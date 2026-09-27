import { Disponibilidad } from "../domain/disponibilidad.entity.js";
import { FranjaHoraria } from "../domain/franja-horaria.js";

export class DisponibilidadService {
  constructor({ disponibilidadRepository, citaRepository, ahora = () => new Date() }) {
    this.disponibilidadRepository = disponibilidadRepository;
    this.citaRepository = citaRepository;
    this.ahora = ahora;
  }

  async configurar(dto) {
    const fallo = mensaje => { throw Object.assign(new Error(mensaje), { statusCode: 400 }); };
    const hora = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!hora.test(dto.horaInicio) || !hora.test(dto.horaFin)) fallo("Usa horarios válidos en formato HH:mm");
    if (dto.horaInicio >= dto.horaFin) fallo("La hora de inicio debe ser menor que la hora de fin");
    if (!Number.isInteger(dto.intervaloMinutos) || dto.intervaloMinutos <= 0) fallo("El intervalo debe ser un entero mayor que cero");
    if (!Number.isInteger(dto.semanasHabilitadas) || dto.semanasHabilitadas <= 0) fallo("Las semanas deben ser un entero mayor que cero");
    const minutos = valor => Number(valor.slice(0,2)) * 60 + Number(valor.slice(3,5));
    if (dto.intervaloMinutos > minutos(dto.horaFin) - minutos(dto.horaInicio)) fallo("La duración de la cita no cabe en el bloque");

    const disponibilidad = new Disponibilidad(dto);
    return await this.disponibilidadRepository.guardar(disponibilidad);
  }

  async obtenerFranjasDisponibles({ medicoId, fecha }) {
    const diaSemana = this.obtenerDiaSemana(fecha);
    const configuraciones = await this.disponibilidadRepository.buscarPorMedicoYDia(medicoId, diaSemana);
    const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(this.ahora()).map(p => [p.type, p.value]));
    const hoy = `${partes.year}-${partes.month}-${partes.day}`;
    const horaActual = `${partes.hour}:${partes.minute}`;
    const dias = (Date.parse(fecha) - Date.parse(hoy)) / 86400000;
    const franjas = configuraciones.filter(c => dias >= 0 && dias < c.semanas_habilitadas * 7)
      .flatMap(c => this.generarFranjas(c));
    const citas = (await this.citaRepository.listarPorMedicoYFecha(medicoId, fecha)) ?? [];
    return franjas.filter(f => (fecha !== hoy || f.horaInicio > horaActual) && !citas.some(c =>
      c.hora_inicio.slice(0,5) < f.horaFin && c.hora_fin.slice(0,5) > f.horaInicio
    )).sort((a,b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  generarFranjas(configuracion) {
    const franjas = [];
    const [hIniH, hIniM] = configuracion.hora_inicio.split(":").map(Number);
    const [hFinH, hFinM] = configuracion.hora_fin.split(":").map(Number);
    let actual = hIniH * 60 + hIniM;
    const fin = hFinH * 60 + hFinM;
    const intervalo = configuracion.intervalo_minutos;

    if (!Number.isInteger(intervalo) || intervalo <= 0) return [];
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