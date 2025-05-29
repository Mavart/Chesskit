import { Grid2 as Grid, Typography } from "@mui/material";
import { Chessboard } from "react-chessboard";
import { PrimitiveAtom, atom, useAtomValue, useSetAtom } from "jotai";
import {
  Arrow,
  CustomPieces,
  CustomSquareRenderer,
  PromotionPieceOption,
  Square,
} from "react-chessboard/dist/chessboard/types";
import { useChessActions } from "@/hooks/useChessActions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, MoveClassification } from "@/types/enums";
import { Chess } from "chess.js";
import { getSquareRenderer } from "./squareRenderer";
import { CurrentPosition } from "@/types/eval";
import EvaluationBar from "./evaluationBar";
import CapturedPieces from "./capturedPieces";
import { moveClassificationColors } from "@/lib/chess";

export interface Props {
  id: string;
  canPlay?: Color | boolean;
  gameAtom: PrimitiveAtom<Chess>;
  boardSize?: number;
  whitePlayer?: string;
  blackPlayer?: string;
  boardOrientation?: Color;
  currentPositionAtom?: PrimitiveAtom<CurrentPosition>;
  showBestMoveArrow?: boolean;
  showPlayerMoveIconAtom?: PrimitiveAtom<boolean>;
  showEvaluationBar?: boolean;
}

export default function Board({
  id: boardId,
  canPlay,
  gameAtom,
  boardSize,
  whitePlayer,
  blackPlayer,
  boardOrientation = Color.White,
  currentPositionAtom = atom({}),
  showBestMoveArrow = false,
  showPlayerMoveIconAtom,
  showEvaluationBar = false,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useAtomValue(gameAtom);
  const { makeMove: makeGameMove } = useChessActions(gameAtom);
  const clickedSquaresAtom = useMemo(() => atom<Square[]>([]), []);
  const setClickedSquares = useSetAtom(clickedSquaresAtom);
  const playableSquaresAtom = useMemo(() => atom<Square[]>([]), []);
  const setPlayableSquares = useSetAtom(playableSquaresAtom);
  const position = useAtomValue(currentPositionAtom);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [moveClickFrom, setMoveClickFrom] = useState<Square | null>(null);
  const [moveClickTo, setMoveClickTo] = useState<Square | null>(null);

  const gameFen = game.fen();

  useEffect(() => {
    setClickedSquares([]);
  }, [gameFen, setClickedSquares]);

  const isPiecePlayable = useCallback(
    ({ piece }: { piece: string }): boolean => {
      if (game.isGameOver() || !canPlay) return false;
      if (canPlay === true || canPlay === piece[0]) return true;
      return false;
    },
    [canPlay, game]
  );

  const onPieceDrop = (
    source: Square,
    target: Square,
    piece: string
  ): boolean => {
    if (!isPiecePlayable({ piece })) return false;

    const result = makeGameMove({
      from: source,
      to: target,
      promotion: piece[1]?.toLowerCase() ?? "q",
    });

    return !!result;
  };

  const resetMoveClick = (square?: Square | null) => {
    setMoveClickFrom(square ?? null);
    setMoveClickTo(null);
    setShowPromotionDialog(false);
    if (square) {
      const moves = game.moves({ square, verbose: true });
      setPlayableSquares(moves.map((m) => m.to));
    } else {
      setPlayableSquares([]);
    }
  };

  const handleSquareLeftClick = (square: Square, piece?: string) => {
    setClickedSquares([]);

    if (!moveClickFrom) {
      if (piece && !isPiecePlayable({ piece })) return;
      resetMoveClick(square);
      return;
    }

    const validMoves = game.moves({ square: moveClickFrom, verbose: true });
    const move = validMoves.find((m) => m.to === square);

    if (!move) {
      resetMoveClick(square);
      return;
    }

    setMoveClickTo(square);

    if (
      move.piece === "p" &&
      ((move.color === "w" && square[1] === "8") ||
        (move.color === "b" && square[1] === "1"))
    ) {
      setShowPromotionDialog(true);
      return;
    }

    const result = makeGameMove({
      from: moveClickFrom,
      to: square,
    });

    resetMoveClick(result ? undefined : square);
  };

  const handleSquareRightClick = (square: Square) => {
    setClickedSquares((prev) =>
      prev.includes(square)
        ? prev.filter((s) => s !== square)
        : [...prev, square]
    );
  };

  const handlePieceDragBegin = (_: string, square: Square) => {
    resetMoveClick(square);
  };

  const handlePieceDragEnd = () => {
    resetMoveClick();
  };

  const onPromotionPieceSelect = (
    piece?: PromotionPieceOption,
    from?: Square,
    to?: Square
  ) => {
    if (!piece) return false;
    const promotionPiece = piece[1]?.toLowerCase() ?? "q";

    if (moveClickFrom && moveClickTo) {
      const result = makeGameMove({
        from: moveClickFrom,
        to: moveClickTo,
        promotion: promotionPiece,
      });
      resetMoveClick();
      return !!result;
    }

    if (from && to) {
      const result = makeGameMove({
        from,
        to,
        promotion: promotionPiece,
      });
      resetMoveClick();
      return !!result;
    }

    resetMoveClick(moveClickFrom);
    return false;
  };

  const customArrows: Arrow[] = useMemo(() => {
    const bestMove = position?.lastEval?.bestMove;
    const moveClassification = position?.eval?.moveClassification;

    if (
      bestMove &&
      showBestMoveArrow &&
      moveClassification !== MoveClassification.Book
    ) {
      const bestMoveArrow = [
        bestMove.slice(0, 2),
        bestMove.slice(2, 4),
        moveClassificationColors[MoveClassification.Good],
      ] as Arrow;

      return [bestMoveArrow];
    }

    return [];
  }, [position, showBestMoveArrow]);

  const customPieces: CustomPieces = {
    wP: ({ squareWidth }) => (
      <img
        src="/pieces/white_pawn.png"
        alt="wP"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    wR: ({ squareWidth }) => (
      <img
        src="/pieces/white_rook.png"
        alt="wR"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    wN: ({ squareWidth }) => (
      <img
        src="/pieces/white_knight.png"
        alt="wN"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    wB: ({ squareWidth }) => (
      <img
        src="/pieces/white_bishop.png"
        alt="wB"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    wQ: ({ squareWidth }) => (
      <img
        src="/pieces/white_queen.png"
        alt="wQ"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    wK: ({ squareWidth }) => (
      <img
        src="/pieces/white_king.png"
        alt="wK"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    bP: ({ squareWidth }) => (
      <img
        src="/pieces/black_pawn.png"
        alt="bP"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    bR: ({ squareWidth }) => (
      <img
        src="/pieces/black_rook.png"
        alt="bR"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    bN: ({ squareWidth }) => (
      <img
        src="/pieces/black_knight.png"
        alt="bN"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    bB: ({ squareWidth }) => (
      <img
        src="/pieces/black_bishop.png"
        alt="bB"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    bQ: ({ squareWidth }) => (
      <img
        src="/pieces/black_queen.png"
        alt="bQ"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
    bK: ({ squareWidth }) => (
      <img
        src="/pieces/black_king.png"
        alt="bK"
        style={{ width: squareWidth, height: squareWidth }}
      />
    ),
  };

  const SquareRenderer: CustomSquareRenderer = useMemo(() => {
    return getSquareRenderer({
      currentPositionAtom: currentPositionAtom,
      clickedSquaresAtom,
      playableSquaresAtom,
      showPlayerMoveIconAtom,
    });
  }, [
    currentPositionAtom,
    clickedSquaresAtom,
    playableSquaresAtom,
    showPlayerMoveIconAtom,
  ]);

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      wrap="nowrap"
      width={boardSize}
    >
      {showEvaluationBar && (
        <EvaluationBar
          height={boardRef?.current?.offsetHeight || boardSize || 400}
          boardOrientation={boardOrientation}
          currentPositionAtom={currentPositionAtom}
        />
      )}

      <Grid
        container
        rowGap={1}
        justifyContent="center"
        alignItems="center"
        paddingLeft={showEvaluationBar ? 2 : 0}
        size="grow"
      >
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          columnGap={2}
          size={12}
        >
          <Typography>
            {boardOrientation === Color.White ? blackPlayer : whitePlayer}
          </Typography>

          <CapturedPieces
            fen={gameFen}
            color={boardOrientation === Color.White ? Color.Black : Color.White}
          />
        </Grid>

        <Grid
          container
          justifyContent="center"
          alignItems="center"
          ref={boardRef}
          size={12}
        >
          <Chessboard
            id={`${boardId}-${canPlay}`}
            position={gameFen}
            onPieceDrop={onPieceDrop}
            boardOrientation={
              boardOrientation === Color.White ? "white" : "black"
            }
            customBoardStyle={{
              borderRadius: "5px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            }}
            customArrows={customArrows}
            isDraggablePiece={isPiecePlayable}
            customSquare={SquareRenderer}
            customDarkSquareStyle={{
              backgroundColor: "#739552",
            }}
            customLightSquareStyle={{
              backgroundColor: "#ebecd0",
            }}
            customPieces={customPieces}
            onSquareClick={handleSquareLeftClick}
            onSquareRightClick={handleSquareRightClick}
            onPieceDragBegin={handlePieceDragBegin}
            onPieceDragEnd={handlePieceDragEnd}
            onPromotionPieceSelect={onPromotionPieceSelect}
            showPromotionDialog={showPromotionDialog}
            promotionToSquare={moveClickTo}
            animationDuration={200}
          />
        </Grid>

        <Grid
          container
          justifyContent="center"
          alignItems="center"
          columnGap={2}
          size={12}
        >
          <Typography>
            {boardOrientation === Color.White ? whitePlayer : blackPlayer}
          </Typography>

          <CapturedPieces fen={gameFen} color={boardOrientation} />
        </Grid>
      </Grid>
    </Grid>
  );
}
