import { useParams } from "react-router-dom";

export default function ClubDetail() {
  const { clubId } = useParams();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Detalle del Club</h1>
      <p className="text-gray-600">ID del club: {clubId}</p>

      <div className="p-4 bg-white border rounded-xl">
        Próximo paso (más adelante): llamar endpoint protegido
        <div className="mt-2 font-mono text-sm">
          GET /clubs/{clubId}/dashboard
        </div>
      </div>
    </div>
  );
}
