'use client';

import { useActionState, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Fuel, Gauge, Trash2 } from 'lucide-react';
import { DamageInspector, SEVERITY_COLOUR, type Marker } from '@/components/three/DamageInspector';
import { saveInspectionAction, type ActionState } from '@/lib/actions/booking';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { PART_LABELS, SEVERITY_LABELS, PHOTO_REQUIREMENTS } from '@/lib/domain/inspection';
import { DAMAGE_SEVERITIES, type DamageSeverity, type VehiclePart } from '@/lib/domain/types';
import type { BodyStyle } from '@/lib/body-style';
import { cn } from '@/lib/cn';

const initial: ActionState = { ok: false };

/**
 * The joint walk-around.
 *
 * Damage is pinned on a 3D model rather than described in a free-text box, so
 * the handover record and the return record can actually be compared.
 */
export function InspectionForm({
  bookingId,
  phase,
  bodyStyle,
  colour,
  initialMarkers,
  initialOdometer,
  initialFuel,
  odometerAtHandover,
  signedByMe,
  signedByOther,
  otherPartyName,
  readOnly = false,
}: {
  bookingId: string;
  phase: 'HANDOVER' | 'RETURN';
  bodyStyle: BodyStyle;
  colour: string;
  initialMarkers: Marker[];
  initialOdometer: number;
  initialFuel: number;
  odometerAtHandover: number | null;
  signedByMe: boolean;
  signedByOther: boolean;
  otherPartyName: string;
  readOnly?: boolean;
}) {
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [odometer, setOdometer] = useState(String(initialOdometer));
  const [fuel, setFuel] = useState(initialFuel);
  const [cleanliness, setCleanliness] = useState('CLEAN');
  const [photos, setPhotos] = useState<Record<string, boolean>>({});
  const [state, action, pending] = useActionState(saveInspectionAction, initial);

  const addMarker = (part: VehiclePart, position: { x: number; y: number; z: number }) => {
    const marker: Marker = {
      id: `m_${Date.now().toString(36)}`,
      part,
      position,
      severity: 'COSMETIC',
      description: '',
      preExisting: phase === 'HANDOVER',
    };
    setMarkers((previous) => [...previous, marker]);
    setSelectedId(marker.id);
  };

  const update = (id: string, patch: Partial<Marker>) =>
    setMarkers((previous) =>
      previous.map((marker) => (marker.id === id ? { ...marker, ...patch } : marker)),
    );

  const remove = (id: string) => {
    setMarkers((previous) => previous.filter((marker) => marker.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const requiredPhotos = PHOTO_REQUIREMENTS.filter((requirement) => requirement.required);
  const capturedCount = requiredPhotos.filter((requirement) => photos[requirement.code]).length;
  const photosDone = capturedCount === requiredPhotos.length;
  const canSign = photosDone && Number(odometer) > 0 && !signedByMe;

  const distance =
    odometerAtHandover !== null && Number(odometer) > 0
      ? Number(odometer) - odometerAtHandover
      : null;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="phase" value={phase} />
      <input type="hidden" name="damages" value={JSON.stringify(markers)} />
      <input type="hidden" name="odometerKm" value={odometer} />
      <input type="hidden" name="fuelLevel" value={fuel} />
      <input type="hidden" name="cleanliness" value={cleanliness} />

      {/* 3D marker placement */}
      <Card className="overflow-hidden">
        <div className="border-b border-white/[0.07] p-5">
          <h2 className="text-[15px] font-semibold text-chalk">Condition</h2>
          <p className="mt-1 text-[12.5px] text-slate-dim">
            {phase === 'HANDOVER'
              ? 'Pin anything already on the car. Whatever you record now is not the renter’s responsibility later.'
              : 'Pin anything new. Marks already recorded at handover are carried across automatically.'}
          </p>
        </div>

        <DamageInspector
          bodyStyle={bodyStyle}
          colour={colour}
          markers={markers}
          onAdd={addMarker}
          onSelect={setSelectedId}
          selectedId={selectedId}
          readOnly={readOnly}
          className="aspect-[16/10] bg-gradient-to-b from-white/[0.03] to-transparent"
        />

        <div className="p-5">
          {markers.length === 0 ? (
            <p className="text-[13px] text-slate-dim">
              No damage recorded. Click the car above to add a mark.
            </p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {markers.map((marker) => (
                  <motion.li
                    key={marker.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={cn(
                        'rounded-xs border p-3.5 transition-colors',
                        selectedId === marker.id
                          ? 'border-amber-500/40 bg-amber-500/[0.06]'
                          : 'border-white/[0.07]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: SEVERITY_COLOUR[marker.severity] }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedId(marker.id)}
                          className="flex-1 text-left text-[13px] font-medium text-chalk"
                        >
                          {PART_LABELS[marker.part]}
                        </button>
                        {marker.preExisting ? <Badge tone="neutral">pre-existing</Badge> : null}
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => remove(marker.id)}
                            className="text-slate-dim transition-colors hover:text-danger"
                            aria-label="Remove marker"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>

                      {selectedId === marker.id && !readOnly ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Select
                            value={marker.severity}
                            onChange={(event) =>
                              update(marker.id, {
                                severity: event.target.value as DamageSeverity,
                              })
                            }
                            className="h-9 text-[12.5px]"
                          >
                            {DAMAGE_SEVERITIES.map((severity) => (
                              <option key={severity} value={severity}>
                                {SEVERITY_LABELS[severity]}
                              </option>
                            ))}
                          </Select>
                          <Input
                            value={marker.description}
                            onChange={(event) =>
                              update(marker.id, { description: event.target.value })
                            }
                            placeholder="e.g. 4 cm scratch below the handle"
                            className="h-9 text-[12.5px]"
                            maxLength={140}
                          />
                        </div>
                      ) : null}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </Card>

      {/* Readings */}
      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-chalk">Readings</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Odometer (km)" error={state.errors?.odometerKm}>
            <div className="relative">
              <Gauge
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400"
              />
              <Input
                value={odometer}
                onChange={(event) => setOdometer(event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="numeric pl-10"
                disabled={readOnly}
              />
            </div>
            {distance !== null ? (
              <p className="mt-1.5 text-[11.5px] text-slate-dim">
                {distance >= 0
                  ? `${distance} km driven since handover.`
                  : 'Lower than the handover reading — check the figure.'}
              </p>
            ) : null}
          </Field>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="record text-[11px] text-mist">
                Fuel level
              </span>
              <span className="numeric text-[13px] text-chalk">{Math.round(fuel * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Fuel size={15} className="shrink-0 text-amber-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={fuel}
                onChange={(event) => setFuel(Number(event.target.value))}
                disabled={readOnly}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

        <Field label="Cleanliness" className="mt-5">
          <Select
            value={cleanliness}
            onChange={(event) => setCleanliness(event.target.value)}
            disabled={readOnly}
          >
            <option value="CLEAN">Clean</option>
            <option value="ACCEPTABLE">Acceptable</option>
            <option value="DIRTY">Dirty</option>
            <option value="HEAVILY_SOILED">Heavily soiled</option>
          </Select>
        </Field>

        <Field label="Notes" className="mt-5">
          <Textarea
            name="notes"
            placeholder="Anything worth writing down — a warning light, a noise, where you parked it."
            className="min-h-20 text-[13px]"
            disabled={readOnly}
          />
        </Field>
      </Card>

      {/* Photos */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-chalk">Photos</h2>
          <Badge tone={photosDone ? 'cedar' : 'warn'}>
            {capturedCount}/{requiredPhotos.length} required
          </Badge>
        </div>
        <p className="mt-1.5 text-[12.5px] text-slate-dim">
          Camera capture is stubbed in this environment — tick each angle to simulate taking it.
        </p>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {PHOTO_REQUIREMENTS.map((requirement) => (
            <li key={requirement.code}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() =>
                  setPhotos((previous) => ({
                    ...previous,
                    [requirement.code]: !previous[requirement.code],
                  }))
                }
                className={cn(
                  'flex w-full items-start gap-3 rounded-xs border p-3.5 text-left transition-colors',
                  photos[requirement.code]
                    ? 'border-cedar-500/40 bg-cedar-500/[0.07]'
                    : 'border-white/[0.07] hover:border-white/20',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border',
                    photos[requirement.code]
                      ? 'border-cedar-500 bg-cedar-500 text-ink-950'
                      : 'border-white/20',
                  )}
                >
                  {photos[requirement.code] ? <Check size={12} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] text-chalk">
                    {requirement.label}
                    {!requirement.required ? (
                      <span className="ml-1.5 text-[11px] text-slate-dim">optional</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-dim">
                    {requirement.guidance}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Signatures */}
      <Card className="p-6">
        <h2 className="text-[15px] font-semibold text-chalk">Signatures</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-dim">
          Both of you sign the same record. Nothing moves forward until both signatures exist.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              'rounded-xs border p-4',
              signedByMe ? 'border-cedar-500/35 bg-cedar-500/[0.07]' : 'border-white/[0.07]',
            )}
          >
            <p className="text-[12.5px] text-chalk">You</p>
            <p className="mt-1 text-[11.5px] text-slate-dim">
              {signedByMe ? 'Signed' : 'Not signed yet'}
            </p>
          </div>
          <div
            className={cn(
              'rounded-xs border p-4',
              signedByOther ? 'border-cedar-500/35 bg-cedar-500/[0.07]' : 'border-white/[0.07]',
            )}
          >
            <p className="text-[12.5px] text-chalk">{otherPartyName}</p>
            <p className="mt-1 text-[11.5px] text-slate-dim">
              {signedByOther ? 'Signed' : 'Waiting'}
            </p>
          </div>
        </div>

        {state.message ? (
          <p
            className={cn(
              'mt-4 text-[12.5px]',
              state.ok ? 'text-cedar-400' : 'text-danger',
            )}
          >
            {state.message}
          </p>
        ) : null}

        {!readOnly ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" name="sign" value="false" variant="secondary" disabled={pending}>
              Save progress
            </Button>
            <Button type="submit" name="sign" value="true" disabled={!canSign || pending}>
              {signedByMe ? 'Already signed' : pending ? 'Signing…' : 'Sign this inspection'}
            </Button>
          </div>
        ) : null}

        {!photosDone && !readOnly ? (
          <p className="mt-3 text-[11.5px] text-warn">
            Capture all {requiredPhotos.length} required angles before signing.
          </p>
        ) : null}
      </Card>
    </form>
  );
}
