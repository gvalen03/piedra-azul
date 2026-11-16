export class ControlMedico {
  constructor({
    id = null,
    historiaClinicaId,
    citaId,
    profesionalId,
    fecha = new Date(),
    motivoConsulta,
    observaciones,
    diagnostico = null,
    tratamiento = null,
    recomendaciones = null
  }) {
    this.id = id;
    this.historiaClinicaId = historiaClinicaId;
    this.citaId = citaId;
    this.profesionalId = profesionalId;
    this.fecha = fecha;
    this.motivoConsulta = motivoConsulta;
    this.observaciones = observaciones;
    this.diagnostico = diagnostico;
    this.tratamiento = tratamiento;
    this.recomendaciones = recomendaciones;
  }
}
