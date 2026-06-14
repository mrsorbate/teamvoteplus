import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { settingsAPI, teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Users, BarChart, Settings, MessageSquare } from 'lucide-react';
import type { Team, TeamMember } from '../types/domain';
import { resolveAssetUrl } from '../lib/utils';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id!);
  const { user } = useAuthStore();

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await teamsAPI.getById(teamId);
      return response.data as Team;
    },
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await teamsAPI.getMembers(teamId);
      return response.data as TeamMember[];
    },
  });

  const { data: organization } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await settingsAPI.getOrganization();
      return response.data;
    },
    staleTime: Infinity,
  });

  const isTrainer = members?.find((member) => member.id === user?.id)?.role === 'trainer';

  if (teamLoading || membersLoading) {
    return <div className="loading-card">Team wird geladen...</div>;
  }

  const trainers = members?.filter((member) => member.role === 'trainer') || [];
  const players = members?.filter((member) => member.role !== 'trainer') || [];
  const teamCrestUrl = resolveAssetUrl(team?.team_crest || organization?.logo);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 sm:gap-4">
          {teamCrestUrl && (
            <img
              src={teamCrestUrl}
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl border border-gray-700/80 bg-gray-900/70 object-contain p-1.5"
            />
          )}
          <div className="flex min-h-12 flex-1 min-w-0 flex-col justify-center sm:min-h-14">
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight break-words">{team?.name}</h1>
            {team?.description && (
              <p className="text-sm sm:text-base text-gray-300 mt-1 break-words">{team.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 sm:space-y-4">
        <Link
          to={`/teams/${teamId}/kader`}
          className="card hover:shadow-md transition-shadow flex items-start sm:items-center space-x-2 sm:space-x-4 text-left"
        >
          <div className="bg-green-900/30 border border-green-700/50 p-2.5 sm:p-3 rounded-lg">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-300" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm sm:text-base">Trainer &amp; Spieler</h3>
            <p className="text-xs sm:text-sm text-gray-300 break-words">{trainers.length} Trainer • {players.length} Spieler</p>
          </div>
        </Link>

        <Link
          to={`/teams/${teamId}/stats`}
          className="card hover:shadow-md transition-shadow flex items-start sm:items-center space-x-2 sm:space-x-4"
        >
          <div className="bg-blue-900/30 border border-blue-700/50 p-2.5 sm:p-3 rounded-lg">
            <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm sm:text-base">Statistiken</h3>
            <p className="text-xs sm:text-sm text-gray-300 break-words">Anwesenheit</p>
          </div>
        </Link>

        <Link
          to={`/teams/${teamId}/posts`}
          className="card hover:shadow-md transition-shadow flex items-start sm:items-center space-x-2 sm:space-x-4"
        >
          <div className="bg-amber-900/30 border border-amber-700/50 p-2.5 sm:p-3 rounded-lg">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm sm:text-base">Nachrichten &amp; Umfragen</h3>
            <p className="text-xs sm:text-sm text-gray-300 break-words">Offene Einträge ansehen</p>
          </div>
        </Link>

        {isTrainer && (
          <Link
            to={`/teams/${teamId}/settings`}
            className="card hover:shadow-md transition-shadow flex items-start sm:items-center space-x-2 sm:space-x-4"
          >
            <div className="bg-gray-800 p-2.5 sm:p-3 rounded-lg">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-100" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm sm:text-base">Einstellungen</h3>
              <p className="text-xs sm:text-sm text-gray-300 break-words">Standards &amp; API</p>
            </div>
          </Link>
        )}
      </div>

    </div>
  );
}
